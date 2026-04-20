-- NeXoNetwork — Script de base de datos
-- Ejecuta: mysql -u root -p nexo_network < scripts/migrate.sql
-- O desde aapanel: Database → nexo_network → SQL

-- ══════════════════════════════════════════════════════════════════════════════
--  TABLA: users
--  Usuarios registrados en NeXoNetwork (emulador + Switch HOME)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id                  BIGINT       UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nexo_id             VARCHAR(64)  NOT NULL UNIQUE,           -- ID interno (ej: "nexo_abc123")
    username            VARCHAR(32)  NOT NULL UNIQUE,           -- nombre de usuario (login)
    email               VARCHAR(128) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    nickname            VARCHAR(64)  DEFAULT NULL,              -- nombre visible en juegos
    country             CHAR(2)      DEFAULT 'US',
    lang                CHAR(5)      DEFAULT 'en',
    region              VARCHAR(16)  DEFAULT NULL,
    subscription_plan   VARCHAR(32)  DEFAULT 'Free',            -- 'Free' | 'Pro'
    is_banned           TINYINT(1)   DEFAULT 0,
    is_admin            TINYINT(1)   DEFAULT 0,
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_nexo_id   (nexo_id),
    INDEX idx_username  (username),
    INDEX idx_email     (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════════════════
--  TABLA: sessions (refresh tokens)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sessions (
    id                  BIGINT       UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT       UNSIGNED NOT NULL,
    token_hash          VARCHAR(128) NOT NULL UNIQUE,           -- SHA-256 del refresh token
    device_info         VARCHAR(128) DEFAULT NULL,
    ip                  VARCHAR(45)  DEFAULT NULL,
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,
    expires_at          DATETIME     NOT NULL,

    INDEX idx_user_id   (user_id),
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ══════════════════════════════════════════════════════════════════════════════
--  TABLA: presence
--  Estado de conexión en tiempo real (online, in_game, offline)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS presence (
    id                  BIGINT       UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT       UNSIGNED NOT NULL UNIQUE,
    status              ENUM('offline','online','in_game') DEFAULT 'offline',
    game_id             VARCHAR(32)  DEFAULT NULL,              -- title_id en hex
    last_seen           DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_presence_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ══════════════════════════════════════════════════════════════════════════════
--  TABLA: friends
--  Lista de amigos entre usuarios
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS friends (
    id                  BIGINT       UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT       UNSIGNED NOT NULL,
    friend_id           BIGINT       UNSIGNED NOT NULL,
    status              ENUM('pending','accepted','blocked') DEFAULT 'pending',
    created_at          DATETIME     DEFAULT CURRENT_TIMESTAMP,

    UNIQUE  KEY uq_friendship (user_id, friend_id),
    INDEX idx_friend_id (friend_id),
    CONSTRAINT fk_friends_user   FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_friends_friend FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ══════════════════════════════════════════════════════════════════════════════
--  TABLA: titles
--  Juegos con soporte online activado
--  compatibility: 'full' | 'partial' | 'none'
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS titles (
    id                  INT          UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title_id            CHAR(16)     NOT NULL UNIQUE,           -- 16 chars hex, ej: "0100000000100000"
    name                VARCHAR(128) NOT NULL,
    protocol            ENUM('npln','nex','raptor') DEFAULT 'npln',
    compatibility       ENUM('full','partial','none') DEFAULT 'none',
    notes               TEXT         DEFAULT NULL,
    updated_at          DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_title_id  (title_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ══════════════════════════════════════════════════════════════════════════════
--  DATOS INICIALES — Juegos con soporte (agrega los que quieras)
-- ══════════════════════════════════════════════════════════════════════════════
INSERT IGNORE INTO titles (title_id, name, protocol, compatibility) VALUES
    ('0100f2c0115b6000', 'Super Mario Maker 2',          'npln', 'partial'),
    ('0100abf008968000', 'Mario Kart 8 Deluxe',           'npln', 'partial'),
    ('01006a800016e000', 'Super Smash Bros. Ultimate',    'npln', 'partial'),
    ('0100c2500fc20000', 'Splatoon 3',                    'npln', 'partial'),
    ('0100aa00154b0000', 'Pokémon Scarlet',               'npln', 'partial'),
    ('01008f6008c5e000', 'Animal Crossing: New Horizons', 'npln', 'partial');
