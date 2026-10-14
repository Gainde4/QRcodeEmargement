'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Users, Clock, ShieldCheck, Wifi, Sparkles, AlertCircle } from 'lucide-react';

const DEFAULT_SESSION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function ProjectorPage() {
  const [token, setToken] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(8);
  const [maxInterval, setMaxInterval] = useState<number>(8);
  const [totalSigned, setTotalSigned] = useState<number>(0);
  const [recentAttendees, setRecentAttendees] = useState<any[]>([]);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    const socket: Socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:session', { sessionId: DEFAULT_SESSION_ID, role: 'projector' });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('qr:update', (data: { rawToken: string; qrDataUrl: string; expiresInSec: number }) => {
      setToken(data.rawToken);
      if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      setMaxInterval(data.expiresInSec || 8);
      setCountdown(data.expiresInSec || 8);
    });

    socket.on('attendance:new', (attendee: any) => {
      setTotalSigned((prev) => prev + 1);
      setRecentAttendees((prev) => [attendee, ...prev.slice(0, 4)]);
    });

    socket.on('session:stats', (stats: { totalSigned: number }) => {
      setTotalSigned(stats.totalSigned);
    });

    // Compte à rebours visuel local ultra-fluide (dixième de seconde)
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0.1 ? Number((prev - 0.1).toFixed(1)) : maxInterval));
    }, 100);

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [maxInterval]);

  const progressPercent = Math.max(0, Math.min(100, (countdown / maxInterval) * 100));

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Session d'Émargement Ouverte
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-1 text-white">
            INF301 - Architectures Distribuées & Sécurité
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Amphithéâtre Alan Turing • Année 2024-2025</p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-6 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="text-3xl font-black text-white">{totalSigned}</div>
              <div className="text-xs text-slate-400 font-medium">Étudiants Émargés</div>
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center gap-2 text-xs">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
            <span className="text-slate-400">{connected ? 'Flux Direct 100ms' : 'Connexion...'}</span>
          </div>
        </div>
      </div>

      {/* Main Center Stage: Huge Dynamic QR Code */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-12 my-8">
        {/* QR Code Container */}
        <div className="relative group">
          {/* Glowing Aura */}
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition duration-1000"></div>

          <div className="relative bg-white p-6 sm:p-8 rounded-3xl shadow-2xl shadow-emerald-500/10 flex flex-col items-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code Dynamique" className="w-72 h-72 sm:w-96 sm:h-96 object-contain" />
            ) : token ? (
              <QRCodeSVG value={token} size={340} level="M" />
            ) : (
              <div className="w-72 h-72 sm:w-96 sm:h-96 flex flex-col items-center justify-center text-slate-500">
                <AlertCircle className="w-12 h-12 text-emerald-600 animate-spin mb-2" />
                <p className="text-sm">Génération du premier jeton cryptographique...</p>
              </div>
            )}

            {/* Countdown Bar underneath QR */}
            <div className="w-full mt-4">
              <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-800 mb-1.5">
                <span className="flex items-center gap-1 text-emerald-700">
                  <Clock className="w-3.5 h-3.5" /> Rotation dynamique
                </span>
                <span className="text-slate-900 bg-slate-200 px-2 py-0.5 rounded-md">
                  {countdown.toFixed(1)}s
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100 ease-linear rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Instructions & Recent Signatures Feed */}
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* Instructions card */}
          <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Consignes d'Émargement
            </h3>
            <ol className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                <span>Ouvrez le portail étudiant sur votre smartphone (connecté à votre compte universitaire).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                <span>Scannez le QR Code projeté. Il change toutes les <strong>8 secondes</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                <span>Vérifiez l'écran vert de confirmation avec votre horodatage certifié.</span>
              </li>
            </ol>
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-amber-400/90 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Les captures d'écran transmises par messagerie expirent avant d'être scannées.</span>
            </div>
          </div>

          {/* Recent Signatures ticker */}
          <div className="bg-slate-900/50 border border-slate-800/60 p-5 rounded-2xl">
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center justify-between">
              <span>Derniers Émargements Validés</span>
              <span className="text-[10px] text-emerald-400">Temps réel</span>
            </h4>
            {recentAttendees.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">En attente des premiers scans de la salle...</p>
            ) : (
              <div className="space-y-2">
                {recentAttendees.map((att, idx) => (
                  <div key={att.attendanceId || idx} className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 px-3 py-2 rounded-xl text-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                        ✓
                      </div>
                      <span className="font-medium text-slate-200">{att.firstName} {att.lastName}</span>
                    </div>
                    <span className="font-mono text-slate-400 text-[11px]">{att.studentNumber || 'Étudiant'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 border-t border-slate-900 pt-4 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Algorithme HMAC-SHA256 • Fenêtre de tolérance serveur ±5s • Anti-rejeu Redis</span>
        </div>
        <div>Session ID: <code className="text-slate-400 font-mono">{DEFAULT_SESSION_ID}</code></div>
      </div>
    </div>
  );
}
