// Package matchmaking abre la base de datos PostgreSQL que usa la matchmaking
// común de Pretendo (nex-protocols-common-go). OJO: es una base SEPARADA de tu
// MySQL. Las cuentas/PID siguen en MySQL (internal/accounts); Postgres solo
// guarda gatherings/sesiones de matchmaking (esquemas matchmaking.* y tracking.*,
// que las propias librerías crean solas en el primer arranque).
package matchmaking

import (
	"database/sql"
	"fmt"

	_ "github.com/lib/pq"
)

// PGConfig son los parámetros de conexión a PostgreSQL.
type PGConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string // "disable" en local; "require" si tu Postgres exige TLS
}

// OpenPostgres conecta a PostgreSQL y verifica la conexión.
func OpenPostgres(cfg PGConfig) (*sql.DB, error) {
	if cfg.SSLMode == "" {
		cfg.SSLMode = "disable"
	}
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}
