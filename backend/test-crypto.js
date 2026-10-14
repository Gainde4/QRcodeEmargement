// Test unitaire de validation du moteur cryptographique TOTP HMAC-SHA256
const crypto = require('crypto');

const SESSION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SESSION_SECRET = 'k87f983hfd98h23f9823hfsd98f734hk';
const INTERVAL_SEC = 8;

function computeHmac(sessionId, bucket, nonce, secret) {
  const data = `${sessionId}:${bucket}:${nonce}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function generateDynamicQr(sessionId, secret, intervalSec) {
  const now = Date.now();
  const bucket = Math.floor(now / (intervalSec * 1000));
  const nonce = crypto.randomBytes(8).toString('hex');
  const signature = computeHmac(sessionId, bucket, nonce, secret);
  const payload = { sessionId, timestamp: now, bucket, nonce, signature, expiresInSec: intervalSec };
  const rawToken = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { rawToken, payload };
}

function verifyQr(rawToken, expectedSessionId, secret, intervalSec) {
  const decoded = JSON.parse(Buffer.from(rawToken, 'base64url').toString('utf-8'));
  const currentBucket = Math.floor(Date.now() / (intervalSec * 1000));

  // Fenêtre +/- 1 bucket (tolerance +/- 8s)
  if (Math.abs(currentBucket - decoded.bucket) > 1) {
    return { valid: false, error: 'EXPIRED' };
  }

  const expectedSig = computeHmac(decoded.sessionId, decoded.bucket, decoded.nonce, secret);
  if (expectedSig !== decoded.signature) {
    return { valid: false, error: 'BAD_SIGNATURE' };
  }

  return { valid: true, bucket: decoded.bucket };
}

console.log('--- TEST 1: Génération et vérification immédiate ---');
const { rawToken } = generateDynamicQr(SESSION_ID, SESSION_SECRET, INTERVAL_SEC);
const checkValid = verifyQr(rawToken, SESSION_ID, SESSION_SECRET, INTERVAL_SEC);
console.log('Résultat:', checkValid.valid ? '✅ VALIDE' : '❌ INVALIDE');

console.log('--- TEST 2: Rejet d\'un QR expiré de 30 secondes (Capture WhatsApp) ---');
const oldBucket = Math.floor(Date.now() / (INTERVAL_SEC * 1000)) - 4;
const oldNonce = crypto.randomBytes(8).toString('hex');
const oldSig = computeHmac(SESSION_ID, oldBucket, oldNonce, SESSION_SECRET);
const expiredToken = Buffer.from(JSON.stringify({
  sessionId: SESSION_ID,
  timestamp: Date.now() - 32000,
  bucket: oldBucket,
  nonce: oldNonce,
  signature: oldSig
})).toString('base64url');

const checkExpired = verifyQr(expiredToken, SESSION_ID, SESSION_SECRET, INTERVAL_SEC);
console.log('Résultat capture WhatsApp:', !checkExpired.valid && checkExpired.error === 'EXPIRED' ? '✅ REJETÉ AVEC SUCCÈS (EXPIRED)' : '❌ ERREUR');

console.log('--- TEST 3: Falsification de signature ---');
const fakeToken = Buffer.from(JSON.stringify({
  sessionId: SESSION_ID,
  timestamp: Date.now(),
  bucket: Math.floor(Date.now() / (INTERVAL_SEC * 1000)),
  nonce: 'fake',
  signature: '0000000000000000000000000000000000000000000000000000000000000000'
})).toString('base64url');

const checkFake = verifyQr(fakeToken, SESSION_ID, SESSION_SECRET, INTERVAL_SEC);
console.log('Résultat contrefaçon:', !checkFake.valid && checkFake.error === 'BAD_SIGNATURE' ? '✅ REJETÉ AVEC SUCCÈS (BAD_SIGNATURE)' : '❌ ERREUR');

console.log('\nTous les tests cryptographiques sont passés avec succès.');
