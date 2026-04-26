-- NeXoNetwork Accounts Core Schema
-- MySQL / MariaDB

CREATE DATABASE IF NOT EXISTS nexo_network CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE nexo_network;

-- ─────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nexo_id       CHAR(19)     NOT NULL UNIQUE,          -- e.g. "NXID-XXXX-XXXX-XXXX"
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

-- ─────────────────────────────────────────────────────────────────────────────
--  SMM2 — Super Mario Maker 2 server tables
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS smm2_courses (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id       CHAR(11)        NOT NULL UNIQUE,   -- XXX-XXX-XXX
    uploader_id     BIGINT UNSIGNED NOT NULL,
    title           VARCHAR(128)    NOT NULL,
    description     TEXT            DEFAULT NULL,
    game_style      ENUM('SMB','SMB3','SMW','NSMBU','SM3DW') NOT NULL DEFAULT 'SMB',
    course_theme    VARCHAR(32)     DEFAULT NULL,
    difficulty      ENUM('easy','normal','expert','super_expert') NOT NULL DEFAULT 'normal',
    course_data     MEDIUMBLOB      NOT NULL,           -- raw binary, stored as-is
    thumbnail       MEDIUMBLOB      DEFAULT NULL,       -- PNG thumbnail
    play_count      INT UNSIGNED    DEFAULT 0,
    clear_count     INT UNSIGNED    DEFAULT 0,
    like_count      INT UNSIGNED    DEFAULT 0,
    is_deleted      BOOLEAN         DEFAULT FALSE,
    created_at      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_course_id     (course_id),
    INDEX idx_uploader_id   (uploader_id),
    INDEX idx_game_style    (game_style),
    INDEX idx_difficulty    (difficulty),
    INDEX idx_created_at    (created_at),
    INDEX idx_like_count    (like_count)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS smm2_clears (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    cleared_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_clear (course_id, user_id),
    FOREIGN KEY (course_id) REFERENCES smm2_courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE CASCADE,
    INDEX idx_clear_course (course_id),
    INDEX idx_clear_user   (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS smm2_likes (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    liked_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_like (course_id, user_id),
    FOREIGN KEY (course_id) REFERENCES smm2_courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE CASCADE,
    INDEX idx_like_course (course_id),
    INDEX idx_like_user   (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS smm2_comments (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    body        VARCHAR(200)    NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id) REFERENCES smm2_courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE CASCADE,
    INDEX idx_comment_course (course_id),
    INDEX idx_comment_user   (user_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
--  SMM2 — Bookmarks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smm2_bookmarks (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bookmark (course_id, user_id),
    FOREIGN KEY (course_id) REFERENCES smm2_courses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE CASCADE,
    INDEX idx_bookmark_user (user_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
--  SMM2 — Endless Mode
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smm2_endless_state (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    difficulty  ENUM('easy','normal','expert','super_expert') NOT NULL,
    run_id      INT UNSIGNED     DEFAULT 1,
    lives       TINYINT UNSIGNED DEFAULT 3,
    clears      INT UNSIGNED     DEFAULT 0,
    is_active   BOOLEAN          DEFAULT FALSE,
    started_at  DATETIME         DEFAULT NULL,
    UNIQUE KEY uq_endless_state (user_id, difficulty),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS smm2_endless_queue (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    difficulty  ENUM('easy','normal','expert','super_expert') NOT NULL,
    run_id      INT UNSIGNED    NOT NULL,
    position    INT UNSIGNED    NOT NULL,
    course_id   BIGINT UNSIGNED NOT NULL,
    cleared     BOOLEAN         DEFAULT FALSE,
    FOREIGN KEY (user_id)   REFERENCES users(id)        ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES smm2_courses(id) ON DELETE CASCADE,
    INDEX idx_endless_queue (user_id, difficulty, run_id, position)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
--  SMM2 — Super Worlds
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smm2_worlds (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_id    BIGINT UNSIGNED NOT NULL UNIQUE,
    title       VARCHAR(128)    NOT NULL,
    description TEXT            DEFAULT NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS smm2_world_courses (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    world_id    BIGINT UNSIGNED     NOT NULL,
    course_id   BIGINT UNSIGNED     NOT NULL,
    position    TINYINT UNSIGNED    NOT NULL,
    UNIQUE KEY uq_world_pos (world_id, position),
    FOREIGN KEY (world_id)  REFERENCES smm2_worlds(id)  ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES smm2_courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
--  SMM2 — Ninji Speed Run Events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS smm2_ninji_events (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(128)    NOT NULL,
    gold_ms     INT UNSIGNED    NOT NULL,
    silver_ms   INT UNSIGNED    NOT NULL,
    bronze_ms   INT UNSIGNED    NOT NULL,
    starts_at   DATETIME        NOT NULL,
    ends_at     DATETIME        NOT NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES smm2_courses(id) ON DELETE CASCADE,
    INDEX idx_ninji_active (starts_at, ends_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS smm2_ninji_times (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id     BIGINT UNSIGNED NOT NULL,
    user_id      BIGINT UNSIGNED NOT NULL,
    time_ms      INT UNSIGNED    NOT NULL,
    submitted_at DATETIME        DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ninji_time (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES smm2_ninji_events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES users(id)             ON DELETE CASCADE,
    INDEX idx_ninji_event (event_id)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
--  MK8 — Mario Kart 8 Deluxe
-- ─────────────────────────────────────────────────────────────────────────────

-- Salas de juego online (hasta 12 jugadores)
CREATE TABLE IF NOT EXISTS mk8_rooms (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    room_code   CHAR(6)         NOT NULL UNIQUE,  -- ej: "XK7P2Q"
    host_id     BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(64)     DEFAULT NULL,
    status      ENUM('waiting','in_race','finished') DEFAULT 'waiting',
    max_players TINYINT UNSIGNED DEFAULT 12,
    is_public   BOOLEAN          DEFAULT TRUE,
    ruleset     JSON             DEFAULT NULL,     -- velocidad, items, vuelta...
    created_at  DATETIME         DEFAULT CURRENT_TIMESTAMP,
    closed_at   DATETIME         DEFAULT NULL,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_mk8_room_status (status),
    INDEX idx_mk8_room_code   (room_code)
) ENGINE=InnoDB;

-- Jugadores dentro de una sala
CREATE TABLE IF NOT EXISTS mk8_room_players (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    room_id     BIGINT UNSIGNED NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    position    TINYINT UNSIGNED DEFAULT NULL,     -- posición final en la carrera
    joined_at   DATETIME         DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_room_player (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES mk8_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tiempos de vuelta por pista (récords personales y globales)
CREATE TABLE IF NOT EXISTS mk8_lap_times (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT UNSIGNED NOT NULL,
    track_id    VARCHAR(64)     NOT NULL,          -- ej: "mario_kart_stadium"
    time_ms     INT UNSIGNED    NOT NULL,          -- tiempo en milisegundos
    vehicle     VARCHAR(64)     DEFAULT NULL,      -- combinación kart/ruedas/ala
    recorded_at DATETIME        DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lap_time (user_id, track_id),   -- solo guarda el mejor
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_mk8_track  (track_id),
    INDEX idx_mk8_time   (time_ms)
) ENGINE=InnoDB;

-- Resultados de carreras (historial)
CREATE TABLE IF NOT EXISTS mk8_race_results (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    room_id     BIGINT UNSIGNED NOT NULL,
    track_id    VARCHAR(64)     NOT NULL,
    user_id     BIGINT UNSIGNED NOT NULL,
    finish_pos  TINYINT UNSIGNED NOT NULL,         -- 1er, 2do, ...
    finish_time INT UNSIGNED    DEFAULT NULL,      -- ms total de la carrera
    points      TINYINT UNSIGNED DEFAULT 0,        -- puntos GP obtenidos
    raced_at    DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES mk8_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)     ON DELETE CASCADE,
    INDEX idx_mk8_result_room (room_id),
    INDEX idx_mk8_result_user (user_id)
) ENGINE=InnoDB;

-- Ranking global por puntos acumulados
CREATE TABLE IF NOT EXISTS mk8_player_stats (
    user_id         BIGINT UNSIGNED PRIMARY KEY,
    races_played    INT UNSIGNED    DEFAULT 0,
    wins            INT UNSIGNED    DEFAULT 0,
    podiums         INT UNSIGNED    DEFAULT 0,    -- top 3
    total_points    INT UNSIGNED    DEFAULT 0,
    updated_at      DATETIME        DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Torneos organizados por admins o usuarios
CREATE TABLE IF NOT EXISTS mk8_tournaments (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    host_id     BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(128)    NOT NULL,
    description TEXT            DEFAULT NULL,
    max_players SMALLINT UNSIGNED DEFAULT 64,
    status      ENUM('open','in_progress','finished') DEFAULT 'open',
    starts_at   DATETIME        NOT NULL,
    ends_at     DATETIME        NOT NULL,
    created_at  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_mk8_tourn_status (status)
) ENGINE=InnoDB;

-- Participantes en un torneo
CREATE TABLE IF NOT EXISTS mk8_tournament_players (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tournament_id   BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    points          INT UNSIGNED    DEFAULT 0,
    joined_at       DATETIME        DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tourn_player (tournament_id, user_id),
    FOREIGN KEY (tournament_id) REFERENCES mk8_tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)       REFERENCES users(id)           ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────────────────────
--  Juegos registrados
-- ─────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO titles (title_id, name, compatibility)
VALUES ('0100000000100000', 'Super Mario Maker 2',    'perfect'),
       ('0100152000022000', 'Mario Kart 8 Deluxe',    'perfect');
