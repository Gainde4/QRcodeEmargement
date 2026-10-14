'use client';

import React from 'react';
import Link from 'next/link';
import { QrCode, Smartphone, ShieldCheck, Monitor, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <QrCode className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              SignSafe QR <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v1.0 Live</span>
            </h1>
            <p className="text-xs text-slate-400">Système d'émargement universitaire anti-fraude</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rotation TOTP HMAC-SHA256 (5-10s)</span>
        </div>
      </header>

      {/* Hero */}
      <section className="my-12 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-emerald-400 mb-4 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Stack : Next.js PWA + Node.js/Socket.io + Redis + PostgreSQL
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Émargement instantané,<br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Sécurité cryptographique sans compromis.
          </span>
        </h2>
        <p className="mt-4 text-slate-400 text-base sm:text-lg max-w-2xl">
          Empêche le partage de capture d'écran via messagerie (WhatsApp/Telegram), le double émargement et l'usurpation d'appareil.
        </p>
      </section>

      {/* Grid of Views */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Projector View */}
        <Link 
          href="/projector"
          className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-300 shadow-xl hover:shadow-emerald-500/10"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
              Écran Vidéoprojecteur
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Affichage grand format du QR Code dynamique qui se régénère toutes les 8 secondes avec jauge de compte à rebours pour la salle.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-cyan-400 gap-1">
            <span>Ouvrir l'écran salle</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Student Mobile View */}
        <Link 
          href="/student"
          className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-300 shadow-xl hover:shadow-emerald-500/10"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
              Scanner Étudiant (PWA)
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Interface mobile fluide avec scan appareil photo, validation d'empreinte d'appareil et confirmation visuelle immédiate.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-emerald-400 gap-1">
            <span>Lancer le scan étudiant</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Supervisor View */}
        <Link 
          href="/supervisor"
          className="group relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all duration-300 shadow-xl hover:shadow-emerald-500/10"
        >
          <div>
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-violet-300 transition-colors">
              Tableau Surveillant
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Contrôle en direct des présents, détection d'anomalies, clôture de session et émargement manuel en cas d'urgence.
            </p>
          </div>
          <div className="mt-6 flex items-center text-xs font-semibold text-violet-400 gap-1">
            <span>Accéder au contrôle</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Guarantees */}
      <footer className="pt-6 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Non-rejeu garanti Redis</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Contrainte ACID PostgreSQL</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Empreinte d'appareil</span>
        </div>
        <p>© 2024 SignSafe - Université Numérique</p>
      </footer>
    </main>
  );
}
