import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Système d'Émargement Sécurisé | QR Code Dynamique",
  description: "Plateforme d'émargement temps réel infalsifiable avec rotation TOTP HMAC-SHA256",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
