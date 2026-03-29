-- NeXoNetwork Accounts Core Schema
-- MySQL / MariaDB

CREATE DATABASE IF NOT EXISTS nexo_network CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexo_network;

-- ─────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nexo_id       CHAR(16)     NOT NULL UNIQUE,          -- e.g. "NXID-XXXX-XXXX-XXXX"
    username      VARCHAR(32)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname      VARCHAR(32)  NOT NULL,
    avatar_url    VARCHAR(512) DEFAULT NULL,
    lang          CHAR(5)      DEFAULT 'en',
    region        VARCHAR(32)  DEFAULT NULL,
    is_banned     BOOLEAN      DEFAULT FALSE,
    ban_reason    TEXT         DEFAULT NULL,
    is_admin      BOOLEAN      DEFAULT FALSE,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_username  (username),
    INDEX idx_email     (email),
    INDEX idx_nexo_id   (nexo_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
--  SESSIONS  (refresh token store)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT UNSIGNED NOT NULL,
    refresh_token CHAR(64)        NOT NULL UNIQUE,        -- SHA-256 hex stored
    device_info   VARCHAR(255)    DEFAULT NULL,           -- emulator / platform info
    ip_address    VARCHAR(45)     DEFAULT NULL,
    expires_at    DATETIME        NOT NULL,
    created_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
    revoked       BOOLEAN         DEFAULT FALSE,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_token (refresh_token),
    INDEX idx_user_id       (user_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
--  FRIENDS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friends (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    requester_id  BIGINT UNSIGNED NOT NULL,
    addressee_id  BIGINT UNSIGNED NOT NULL,
    status        ENUM('pending','accepted','blocked') DEFAULT 'pending',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_friendship   (requester_id, addressee_id),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_addressee (addressee_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────
--  PRESENCE  (online status per user)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presence (
    user_id       BIGINT UNSIGNED PRIMARY KEY,
    status        ENUM('online','offline','in_game') DEFAULT 'offline',
    game_title    VARCHAR(128)  DEFAULT NULL,
    game_id       VARCHAR(32)   DEFAULT NULL,
    last_seen     DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
--  TITLES  (lista de juegos compatibles — config-lp1)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS titles (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title_id      CHAR(16)    NOT NULL UNIQUE,   -- ID de título Nintendo (hex, ej: 0100F2C0115B6000)
    name          VARCHAR(255) NOT NULL,
    compatibility ENUM('perfect','playable','ingame','boots','nothing') DEFAULT 'playable',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_title_id (title_id)
) ENGINE=InnoDB;
