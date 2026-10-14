# 🛡️ SignSafe QR - Système d'Émargement par QR Code Dynamique Sécurisé

Système complet d'émargement universitaire et professionnel infalsifiable, ultra-rapide (< 100 ms) et résistant aux fraudes courantes (partage de capture d'écran, double émargement, usurpation d'identité).

---

## 🏗️ Architecture Technique Réalisée

| Composant | Technologie | Rôle |
| :--- | :--- | :--- |
| **Frontend PWA** | Next.js 14, Tailwind CSS, Lucide | PWA mobile pour étudiants, grand écran pour vidéoprojecteur, dashboard surveillant |
| **Backend & API** | Node.js, Express, TypeScript | API REST haute performance (< 100 ms) |
| **Communication Live** | WebSockets (Socket.io) | Diffusion temps réel du QR Code (toutes les 8s) & compteurs d'émargement |
| **Sécurité & Non-Rejeu** | Redis 7 & TOTP HMAC-SHA256 | Cache en mémoire pour validation de bucket temporel et verrous d'empreintes d'appareils |
| **Base de Données** | PostgreSQL 16 | Contrainte ACID d'unicité `(session_id, student_id)` et registre certifié |

---

## 🔐 Spécification Cryptographique du QR Code

1. **Calcul du Bucket Temporel :**
   $$\text{Bucket} = \left\lfloor \frac{\text{Timestamp}_{\text{ms}}}{8000} \right\rfloor$$
2. **Signature HMAC :**
   $$\text{Signature} = \text{HMAC-SHA256}(\text{SessionID} + \text{Bucket} + \text{Nonce}, \text{SessionSecret})$$
3. **Fenêtre d'Admissibilité :**
   $$\Delta \text{Bucket} \in \{-1, 0, +1\} \quad (\pm 8 \text{ secondes pour compenser la latence réseau})$$
4. **Anti-Rejeu (Redis) :**
   Chaque `nonce` validé est stocké dans Redis avec un TTL de $24$ secondes (`EX 24`). Toute deuxième soumission du même nonce est instantanément rejetée.
5. **Anti-Prêt de Smartphone (Device Fingerprint) :**
   Verrouillage de l'empreinte navigateur sur un compte étudiant unique pour la session.

---

## 📂 Structure du Répertoire

```text
qr-emargement/
├── docker-compose.yml              # Orchestration PostgreSQL 16, Redis 7, Backend, Frontend
├── README.md                       # Guide complet d'architecture et démarrage
├── database/
│   └── init.sql                    # Schéma SQL, contraintes UNIQUE, index et données de test
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── .env.example
│   └── src/
│       ├── index.ts                # Serveur Express & WebSockets
│       ├── config.ts               # Connexions PostgreSQL et Redis
│       ├── services/
│       │   ├── qrSecurity.service.ts   # Moteur HMAC-SHA256 & validation TOTP
│       │   ├── attendance.service.ts   # Transaction ACID & contrôle d'unicité
│       │   └── sessionSocket.service.ts# Ticker Socket.io de rotation (8s)
│       ├── controllers/
│       │   ├── auth.controller.ts      # SSO étudiant / surveillant & JWT
│       │   ├── session.controller.ts   # Cycle de vie des sessions
│       │   └── attendance.controller.ts# Endpoint /scan et émargement manuel
│       └── routes/
│           └── api.routes.ts
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   ├── public/manifest.json        # Configuration PWA
│   └── src/app/
│       ├── page.tsx                # Portail d'accès
│       ├── projector/page.tsx      # Vue grand écran avec QR rotatif & décompte
│       ├── student/page.tsx        # Vue scanner mobile étudiant & Écran Vert
│       └── supervisor/page.tsx     # Dashboard surveillant & export émargements
└── demo-standalone/
    └── index.html                  # Simulation interactive immédiate (0 dépendance)
```

---

## 🚀 Démarrage Rapide

### Option 1 : Déploiement Conteneurisé (Recommandé)

```bash
docker compose up --build -d
```
Accès aux interfaces :
* **Portail d'accueil :** [http://localhost:3000](http://localhost:3000)
* **Écran Vidéoprojecteur :** [http://localhost:3000/projector](http://localhost:3000/projector)
* **Scanner Mobile Étudiant (PWA) :** [http://localhost:3000/student](http://localhost:3000/student)
* **Console Surveillant :** [http://localhost:3000/supervisor](http://localhost:3000/supervisor)
* **Backend API :** [http://localhost:4000](http://localhost:4000)

---

### Option 2 : Test Immédiat dans le Navigateur (Sans dépendance)

Ouvrez simplement le fichier `demo-standalone/index.html` dans Chrome ou Edge :
* Génère en direct les QR codes avec HMAC-SHA256
* Fait tourner la rotation toutes les 8 secondes avec jauge animée
* Permet de tester le scan et d'afficher **l'Écran Vert de confirmation**
* Boutons intégrés pour simuler les attaques :
  * *Tester envoi capture WhatsApp (30s)* $\to$ Rejet pour expiration
  * *Tester double émargement* $\to$ Rejet pour contrainte d'unicité
