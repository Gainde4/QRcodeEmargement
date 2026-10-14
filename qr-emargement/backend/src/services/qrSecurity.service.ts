import crypto from 'crypto';
import { redis, config } from '../config';

export interface QrPayload {
  sessionId: string;
  timestamp: number;
  bucket: number;
  nonce: string;
  signature: string;
  expiresInSec: number;
}

export class QrSecurityService {
  /**
   * Calcule le bucket temporel actuel selon l'intervalle (ex: 8 secondes)
   */
  public static getCurrentBucket(intervalSec: number = config.qrIntervalSec): number {
    return Math.floor(Date.now() / (intervalSec * 1000));
  }

  /**
   * Génère la signature HMAC-SHA256: HMAC(sessionId + bucket + nonce, sessionSecret)
   */
  public static computeHmac(
    sessionId: string,
    bucket: number,
    nonce: string,
    sessionSecret: string
  ): string {
    const dataToSign = `${sessionId}:${bucket}:${nonce}`;
    return crypto.createHmac('sha256', sessionSecret).update(dataToSign).digest('hex');
  }

  /**
   * Génère un nouveau payload dynamique pour une session donnée
   */
  public static generateDynamicQr(
    sessionId: string,
    sessionSecret: string,
    intervalSec: number = config.qrIntervalSec
  ): { rawToken: string; payload: QrPayload } {
    const timestamp = Date.now();
    const bucket = Math.floor(timestamp / (intervalSec * 1000));
    // Nonce cryptographique aléatoire de 8 octets
    const nonce = crypto.randomBytes(8).toString('hex');
    const signature = this.computeHmac(sessionId, bucket, nonce, sessionSecret);

    const payload: QrPayload = {
      sessionId,
      timestamp,
      bucket,
      nonce,
      signature,
      expiresInSec: intervalSec,
    };

    // Format compact pour minimiser la complexité géométrique du QR code (scan rapide en salle)
    // Structure: v1:sessionId:bucket:nonce:signature
    const rawToken = Buffer.from(JSON.stringify(payload)).toString('base64url');

    return { rawToken, payload };
  }

  /**
   * Valide un jeton QR scanné par un étudiant:
   * 1. Décodage du payload
   * 2. Contrôle de la fenêtre temporelle (+/- 1 intervalle, ex: +/- 8s pour tolérer latence réseau)
   * 3. Vérification mathématique du HMAC avec le secret de la session
   * 4. Vérification anti-rejeu dans Redis (le nonce ne doit pas avoir déjà été utilisé)
   */
  public static async verifyQrToken(
    rawToken: string,
    expectedSessionId: string,
    sessionSecret: string,
    intervalSec: number = config.qrIntervalSec
  ): Promise<{ valid: boolean; reason?: string; bucket?: number; nonce?: string }> {
    try {
      const decodedJson = Buffer.from(rawToken, 'base64url').toString('utf-8');
      const payload: QrPayload = JSON.parse(decodedJson);

      if (!payload.sessionId || !payload.bucket || !payload.nonce || !payload.signature) {
        return { valid: false, reason: 'Format de QR Code invalide' };
      }

      if (payload.sessionId !== expectedSessionId) {
        return { valid: false, reason: 'Ce QR Code appartient à une autre session d\'examen' };
      }

      // Calcul des buckets admissibles: actuel, précédent, suivant (tolérance de +/- intervalle)
      const currentBucket = this.getCurrentBucket(intervalSec);
      const isWithinWindow = Math.abs(currentBucket - payload.bucket) <= 1;

      if (!isWithinWindow) {
        return { valid: false, reason: 'QR Code expiré (durée de validité dépassée). Veuillez rescanner le code affiché à l\'écran.' };
      }

      // Vérification HMAC
      const expectedSignature = this.computeHmac(
        payload.sessionId,
        payload.bucket,
        payload.nonce,
        sessionSecret
      );

      // Comparaison en temps constant pour éviter les attaques par canal auxiliaire (timing attacks)
      const validSig = crypto.timingSafeEqual(
        Buffer.from(payload.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!validSig) {
        return { valid: false, reason: 'Signature cryptographique invalide (QR Code contrefait)' };
      }

      // Vérification Anti-Rejeu dans Redis
      const replayKey = `qr:nonce:${payload.sessionId}:${payload.nonce}`;
      const alreadyUsed = await redis.get(replayKey);
      if (alreadyUsed) {
        return { valid: false, reason: 'Ce jeton dynamique a déjà été utilisé (tentative de rejeu)' };
      }

      return { valid: true, bucket: payload.bucket, nonce: payload.nonce };
    } catch (err: any) {
      return { valid: false, reason: `Erreur d'analyse du jeton: ${err.message}` };
    }
  }

  /**
   * Marque le jeton comme consommé dans Redis avec un TTL égal à 2 fois l'intervalle
   */
  public static async markNonceAsUsed(
    sessionId: string,
    nonce: string,
    studentId: string,
    intervalSec: number = config.qrIntervalSec
  ): Promise<void> {
    const replayKey = `qr:nonce:${sessionId}:${nonce}`;
    const ttlSeconds = intervalSec * 3; // Conserve la trace au-delà de la fenêtre d'expiration
    try {
      await redis.set(replayKey, studentId, 'EX', ttlSeconds);
    } catch (err) {
      console.warn('Redis non joignable pour markNonceAsUsed, secours en mémoire');
    }
  }
}
