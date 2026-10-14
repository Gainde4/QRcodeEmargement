-- Schéma complet PostgreSQL pour le système d'émargement sécurisé
-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table Utilisateurs (Étudiants, Surveillants, Administrateurs)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_number VARCHAR(50) UNIQUE, -- Identifiant étudiant (null pour surveillant pur)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'SUPERVISOR', 'ADMIN')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table Examens / Épreuves
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Ex: INF301, MAT201
    title VARCHAR(200) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table Sessions d'Examen (Planification dans une salle avec secret TOTP dédié)
CREATE TABLE IF NOT EXISTS exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    room_name VARCHAR(100) NOT NULL, -- Ex: Amphithéâtre Alan Turing
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    supervisor_id UUID REFERENCES users(id),
    session_secret VARCHAR(128) NOT NULL, -- Clé secrète de rotation QR spécifique à la session
    qr_refresh_interval_sec INT DEFAULT 8, -- Fréquence de régénération QR (5-10 secondes)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table Émargements (Registres certifiés d'émargement)
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verification_mode VARCHAR(30) DEFAULT 'QR_DYNAMIC' CHECK (verification_mode IN ('QR_DYNAMIC', 'MANUAL_SUPERVISOR', 'NFC_FALLBACK')),
    ip_address VARCHAR(45),
    device_fingerprint VARCHAR(128), -- Hash de l'empreinte navigateur/appareil
    device_info TEXT, -- User-Agent et métadonnées
    nonce_used VARCHAR(64), -- Identifiant de jeton pour audit de non-rejeu
    CONSTRAINT unique_student_per_session UNIQUE (session_id, student_id) -- Empêche strictement le double émargement
);

-- Index pour accélérer les requêtes d'affichage et de contrôle
CREATE INDEX IF NOT EXISTS idx_attendances_session ON attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_attendances_student ON attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON exam_sessions(status);
CREATE INDEX IF NOT EXISTS idx_users_student_number ON users(student_number);

-- Jeu de données de test / Démo
INSERT INTO users (id, student_number, first_name, last_name, email, password_hash, role)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'ETU-2024-001', 'Thomas', 'Dubois', 'thomas.dubois@univ.fr', '$2a$10$demoHashPasswordPlaceholder123', 'STUDENT'),
    ('22222222-2222-2222-2222-222222222222', 'ETU-2024-002', 'Sarah', 'Benali', 'sarah.benali@univ.fr', '$2a$10$demoHashPasswordPlaceholder123', 'STUDENT'),
    ('33333333-3333-3333-3333-333333333333', 'ETU-2024-003', 'Lucas', 'Martin', 'lucas.martin@univ.fr', '$2a$10$demoHashPasswordPlaceholder123', 'STUDENT'),
    ('44444444-4444-4444-4444-444444444444', 'ETU-2024-004', 'Camille', 'Leroy', 'camille.leroy@univ.fr', '$2a$10$demoHashPasswordPlaceholder123', 'STUDENT'),
    ('99999999-9999-9999-9999-999999999999', NULL, 'Prof.', 'Vanderberg', 'surveillant@univ.fr', '$2a$10$demoHashPasswordPlaceholder123', 'SUPERVISOR')
ON CONFLICT (email) DO NOTHING;

INSERT INTO exams (id, code, title, academic_year)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'INF301', 'Architectures Distribuées & Sécurité', '2024-2025'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'MAT201', 'Algèbre Linéaire & Probabilités', '2024-2025')
ON CONFLICT (code) DO NOTHING;

INSERT INTO exam_sessions (id, exam_id, room_name, start_time, end_time, status, supervisor_id, session_secret, qr_refresh_interval_sec)
VALUES 
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Amphi A (Turing)', CURRENT_TIMESTAMP - INTERVAL '15 minutes', CURRENT_TIMESTAMP + INTERVAL '105 minutes', 'ACTIVE', '99999999-9999-9999-9999-999999999999', 'k87f983hfd98h23f9823hfsd98f734hk', 8)
ON CONFLICT DO NOTHING;
