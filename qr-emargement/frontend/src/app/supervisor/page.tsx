'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { ShieldCheck, Users, Search, CheckCircle, Clock, FileSpreadsheet, Lock, AlertCircle, UserPlus } from 'lucide-react';

const DEFAULT_SESSION_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export default function SupervisorDashboard() {
  const [session, setSession] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [demoStudents, setDemoStudents] = useState<any[]>([]);

  useEffect(() => {
    // Charger les détails de la session
    fetch(`${BACKEND_URL}/api/sessions/${DEFAULT_SESSION_ID}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.session) setSession(data.session);
        if (data.attendances) setAttendances(data.attendances);
      })
      .catch((err) => console.log('Backend chargement initial:', err.message))
      .finally(() => setLoading(false));

    // Charger les étudiants pour le menu d'émargement manuel
    fetch(`${BACKEND_URL}/api/auth/demo-users`)
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setDemoStudents(data.users.filter((u: any) => u.role === 'STUDENT'));
      })
      .catch(() => {});

    // Socket.io pour les mises à jour en direct
    const socket: Socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join:session', { sessionId: DEFAULT_SESSION_ID, role: 'supervisor' });
    });

    socket.on('attendance:new', (newAtt: any) => {
      setAttendances((prev) => [
        {
          id: newAtt.attendanceId,
          student_id: newAtt.studentId,
          first_name: newAtt.firstName,
          last_name: newAtt.lastName,
          student_number: newAtt.studentNumber,
          signed_at: newAtt.signedAt,
          verification_mode: newAtt.verificationMode,
        },
        ...prev.filter((p) => p.student_id !== newAtt.studentId),
      ]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleManualSign = async (studentId: string) => {
    if (!confirm('Confirmer l\'émargement manuel pour cet étudiant ?')) return;

    // Login en surveillant pour obtenir token JWT
    try {
      const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'surveillant@univ.fr' }),
      });
      const loginData = await loginRes.json();

      const signRes = await fetch(`${BACKEND_URL}/api/attendance/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginData.token}`,
        },
        body: JSON.stringify({
          sessionId: DEFAULT_SESSION_ID,
          studentId,
        }),
      });

      const resJson = await signRes.json();
      if (resJson.success) {
        alert('Émargement manuel validé !');
      } else {
        alert(resJson.error || 'Erreur lors de l\'émargement manuel');
      }
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const filteredAttendances = attendances.filter((att) => {
    const q = searchQuery.toLowerCase();
    return (
      att.first_name?.toLowerCase().includes(q) ||
      att.last_name?.toLowerCase().includes(q) ||
      att.student_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Console de Surveillance d'Épreuve</h1>
            <p className="text-xs text-slate-400">Prof. Vanderberg • Réf: INF301</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Session Active
          </span>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 hover:bg-slate-800 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exporter PDF / CSV</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Présents Émargés</div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{attendances.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Sur 38 étudiants inscrits</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Rotation Clé QR</div>
          <div className="text-3xl font-extrabold text-cyan-400 mt-2">8s</div>
          <div className="text-[11px] text-slate-500 mt-1">Tolérance réseau ±5s</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium">Tentatives Anormales</div>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">0</div>
          <div className="text-[11px] text-slate-500 mt-1">Rejets anti-rejeu ou hors délai</div>
        </div>
      </div>

      {/* Controls & Attendance Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher nom, prénom, n° carte..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Manual check-in quick selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Émargement d'urgence :</span>
            <select
              className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              onChange={(e) => {
                if (e.target.value) {
                  handleManualSign(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Sélectionner un étudiant...</option>
              {demoStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.student_number})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6">N° Étudiant</th>
                <th className="py-3.5 px-6">Nom & Prénom</th>
                <th className="py-3.5 px-6">Horodatage Certifié</th>
                <th className="py-3.5 px-6">Mode de Signature</th>
                <th className="py-3.5 px-6">Statut ACID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                    Aucun émargement enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-6 font-mono font-medium text-emerald-400">
                      {att.student_number}
                    </td>
                    <td className="py-3 px-6 font-semibold text-white">
                      {att.first_name} {att.last_name}
                    </td>
                    <td className="py-3 px-6 text-slate-300">
                      {new Date(att.signed_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        att.verification_mode === 'MANUAL_SUPERVISOR'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {att.verification_mode}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Enregistré
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
