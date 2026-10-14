'use client';

import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, XCircle, ShieldCheck, UserCheck, Smartphone, RefreshCw, AlertTriangle } from 'lucide-react';

const DEFAULT_SESSION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function StudentScanPage() {
  const [currentUser, setCurrentUser] = useState<any>({
    id: '11111111-1111-1111-1111-111111111111',
    firstName: 'Thomas',
    lastName: 'Dubois',
    studentNumber: 'ETU-2024-001',
    role: 'STUDENT',
  });
  const [jwtToken, setJwtToken] = useState<string>('');
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  // Initialisation de l'empreinte d'appareil (Canvas + UserAgent hash)
  useEffect(() => {
    let fp = localStorage.getItem('signsafe_device_fp');
    if (!fp) {
      fp = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
      localStorage.setItem('signsafe_device_fp', fp);
    }
    setDeviceFingerprint(fp);

    // Récupérer un jeton JWT de test pour l'étudiant
    fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentNumber: currentUser.studentNumber }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token) setJwtToken(data.token);
      })
      .catch((err) => console.log('Backend non disponible encore, mode démo prêt:', err.message));

    // Charger les étudiants de test
    fetch(`${BACKEND_URL}/api/auth/demo-users`)
      .then((res) => res.json())
      .then((data) => {
        if (data.users) {
          setDemoUsers(data.users.filter((u: any) => u.role === 'STUDENT'));
        }
      })
      .catch(() => {});
  }, [currentUser.studentNumber]);

  const switchStudent = (student: any) => {
    setCurrentUser(student);
    setStatus('IDLE');
    setAttendanceData(null);
  };

  const handleScanSubmit = async (tokenToSubmit?: string) => {
    const rawQr = tokenToSubmit || manualTokenInput.trim();
    if (!rawQr) {
      alert('Veuillez renseigner ou scanner un token QR');
      return;
    }

    setLoading(true);
    setStatus('IDLE');

    try {
      const response = await fetch(`${BACKEND_URL}/api/attendance/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          sessionId: DEFAULT_SESSION_ID,
          rawQrToken: rawQr,
          deviceFingerprint,
          deviceInfo: navigator.userAgent,
        }),
      });

      const resJson = await response.json();

      if (response.ok && resJson.success) {
        setStatus('SUCCESS');
        setStatusMessage(resJson.message);
        setAttendanceData(resJson.attendance);
      } else {
        setStatus('ERROR');
        setStatusMessage(resJson.error || 'Validation refusée');
      }
    } catch (err: any) {
      setStatus('ERROR');
      setStatusMessage(`Impossible de joindre le serveur: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Header Mobile */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Émargement Étudiant</h1>
            <p className="text-[11px] text-emerald-400">Compte vérifié & SSO</p>
          </div>
        </div>

        {/* Student Switcher dropdown for quick testing */}
        {demoUsers.length > 0 && (
          <select
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 outline-none"
            value={currentUser.studentNumber}
            onChange={(e) => {
              const u = demoUsers.find((x) => x.student_number === e.target.value);
              if (u) switchStudent(u);
            }}
          >
            {demoUsers.map((u) => (
              <option key={u.id} value={u.student_number}>
                {u.first_name} ({u.student_number})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Content Area */}
      <div className="my-auto py-4">
        {/* State: SUCCESS (Écran Vert d'émargement) */}
        {status === 'SUCCESS' ? (
          <div className="bg-emerald-950/40 border-2 border-emerald-500/80 rounded-3xl p-8 text-center shadow-2xl shadow-emerald-500/20 animate-fadeIn">
            <div className="w-20 h-20 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-2">
              Présence Certifiée
            </span>

            <h2 className="text-2xl font-black text-white">Émargement Validé !</h2>
            <p className="text-sm text-emerald-200/80 mt-1">
              Votre signature numérique a été inscrite de façon permanente dans le registre d'examen.
            </p>

            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 mt-6 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Étudiant :</span>
                <span className="font-semibold text-white">{currentUser.firstName} {currentUser.lastName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">N° Carte :</span>
                <span className="font-mono text-emerald-400 font-bold">{currentUser.studentNumber}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Date & Heure :</span>
                <span className="text-slate-200">{new Date().toLocaleTimeString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mode :</span>
                <span className="text-emerald-400 font-mono">QR_DYNAMIC_HMAC</span>
              </div>
            </div>

            <button
              onClick={() => setStatus('IDLE')}
              className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-400 font-semibold text-xs rounded-xl transition"
            >
              Effectuer un nouveau scan
            </button>
          </div>
        ) : status === 'ERROR' ? (
          /* State: ERROR (Alerte Fraude ou Expiration) */
          <div className="bg-rose-950/40 border-2 border-rose-500/80 rounded-3xl p-6 text-center shadow-2xl shadow-rose-500/10 animate-fadeIn">
            <div className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/30">
              <XCircle className="w-10 h-10" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold text-xs uppercase tracking-wider mb-2">
              Émargement Refusé
            </span>

            <h2 className="text-xl font-extrabold text-white">Validation Impossible</h2>
            <p className="text-xs text-rose-200 mt-2 bg-rose-950/60 p-3 rounded-xl border border-rose-500/30 font-medium">
              {statusMessage}
            </p>

            <button
              onClick={() => setStatus('IDLE')}
              className="mt-6 w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-rose-600/30"
            >
              Réessayer en direct
            </button>
          </div>
        ) : (
          /* State: IDLE (Scanner de QR code) */
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                <Camera className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Scannez le QR Code Projeté</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Pointez l'objectif de votre smartphone vers le vidéoprojecteur dans l'amphithéâtre.
              </p>

              {/* Simulated Camera Window */}
              <div className="relative mt-5 aspect-square max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-950 flex flex-col items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent"></div>
                {/* Laser scan animation line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce"></div>
                <div className="text-slate-500 text-xs font-mono text-center p-4 z-10">
                  <p>Caméra prête</p>
                  <p className="text-[10px] text-slate-600 mt-1">Collez ou entrez le token dynamique ci-dessous pour tester</p>
                </div>
              </div>
            </div>

            {/* Input field for testing or scanned token */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
                <span>Jeton QR scanné (Base64url HMAC) :</span>
                <span className="text-[10px] text-slate-500 font-mono">Auto-injecté</span>
              </label>
              <textarea
                rows={2}
                placeholder="Collez ici le jeton affiché sur le projecteur ou scannez..."
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 resize-none"
              />
              <button
                onClick={() => handleScanSubmit()}
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validation cryptographique...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Valider mon émargement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-900 text-[11px] text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>{currentUser.firstName} {currentUser.lastName} ({currentUser.studentNumber})</span>
        </div>
        <span className="font-mono text-[10px]">FP: {deviceFingerprint.slice(0, 10)}...</span>
      </div>
    </div>
  );
}
