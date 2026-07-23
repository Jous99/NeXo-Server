-- Migración: ajustes de sitio + roadmap + blog
-- Aplicar en una instalación existente:
--   mysql -u <user> -p <db_name> < scripts/migrate-content.sql
-- Es idempotente (CREATE TABLE IF NOT EXISTS / INSERT IGNORE), se puede correr varias veces.

CREATE TABLE IF NOT EXISTS site_settings (
    setting_key   VARCHAR(64)  NOT NULL PRIMARY KEY,
    setting_value TEXT         DEFAULT NULL,
    updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES
    ('registrations_enabled',        '1'),
    ('registrations_closed_message', 'Los registros están cerrados temporalmente.');

CREATE TABLE IF NOT EXISTS roadmap_items (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(160)  NOT NULL,
    description   TEXT          DEFAULT NULL,
    status        ENUM('planned','in_progress','done') NOT NULL DEFAULT 'planned',
    sort_order    INT           NOT NULL DEFAULT 0,
    created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_roadmap_order (sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS blog_posts (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug          VARCHAR(180)  NOT NULL UNIQUE,
    title         VARCHAR(200)  NOT NULL,
    summary       VARCHAR(400)  DEFAULT NULL,
    body          MEDIUMTEXT    NOT NULL,
    author        VARCHAR(64)   DEFAULT NULL,
    published     BOOLEAN       DEFAULT TRUE,
    created_at    DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_blog_pub (published, created_at)
) ENGINE=InnoDB;
