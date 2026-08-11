// Package accounts looks up NEX accounts (PID + Kerberos password) for the
// ticket-granting server, backed by the same MySQL `users` table Node uses.
package accounts

import (
	"database/sql"
	"errors"
	"fmt"
	"strconv"

	nex "github.com/PretendoNetwork/nex-go/v2"
	"github.com/PretendoNetwork/nex-go/v2/types"
	_ "github.com/go-sql-driver/mysql"
)

// Store resolves nex.Account values either from a fixed set of "special"
// accounts (e.g. the pseudo-account representing a game's secure server —
// see https://nintendo-wiki.pretendo.network/docs/nex/kerberos) or from the
// `users` table for real player accounts.
type Store struct {
	db            *sql.DB
	specialByName map[string]*nex.Account
	specialByPID  map[uint64]*nex.Account
}

// Config holds the MySQL connection parameters — the same DB_* values Node
// already reads from .env (see src/db.js).
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

// Open connects to the shared MySQL database.
func Open(cfg Config) (*Store, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Name)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &Store{
		db:            db,
		specialByName: make(map[string]*nex.Account),
		specialByPID:  make(map[uint64]*nex.Account),
	}, nil
}

// AddSpecialAccount registers a non-player account (e.g. a game's secure
// server) so it resolves via ByPID/ByUsername just like a real user.
func (s *Store) AddSpecialAccount(account *nex.Account) {
	s.specialByName[string(account.Username)] = account
	s.specialByPID[uint64(account.PID)] = account
}

// ByPID implements the nex.PRUDPEndPoint.AccountDetailsByPID callback.
// El PID de NEX es el `nex_principal_id` (el hash u64 del perfil local del
// emulador que el juego usa como principal — ver acc.cpp: account_id.Hash()).
func (s *Store) ByPID(pid types.PID) (*nex.Account, *nex.Error) {
	if account, ok := s.specialByPID[uint64(pid)]; ok {
		return account, nil
	}
	return s.lookup("nex_principal_id = ?", uint64(pid))
}

// ByUsername implements the nex.PRUDPEndPoint.AccountDetailsByUsername callback.
// En el ticket-granting de NEX, el "username" ES el principal ID (numérico): el
// emulador manda el hash u64 de su perfil local. Lo resolvemos por
// nex_principal_id. Si no es numérico (otros usos), caemos a la columna username.
func (s *Store) ByUsername(username string) (*nex.Account, *nex.Error) {
	if account, ok := s.specialByName[username]; ok {
		return account, nil
	}
	if _, err := strconv.ParseUint(username, 10, 64); err == nil {
		return s.lookup("nex_principal_id = ?", username)
	}
	return s.lookup("username = ?", username)
}

func (s *Store) lookup(where string, arg any) (*nex.Account, *nex.Error) {
	// Devolvemos nex_principal_id como PID para que el ticket y la conexión
	// "secure" usen el MISMO identificador que el emulador. Exigimos que estén
	// puestos nex_principal_id y nex_password (sin ellos no hay NEX posible).
	row := s.db.QueryRow(
		fmt.Sprintf("SELECT nex_principal_id, username, nex_password FROM users "+
			"WHERE %s AND is_banned = 0 AND nex_principal_id IS NOT NULL AND nex_password IS NOT NULL LIMIT 1", where),
		arg,
	)

	var pid uint64
	var username, nexPassword string

	if err := row.Scan(&pid, &username, &nexPassword); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nex.NewError(nex.ResultCodes.Authentication.ValidationFailed, "account not found")
		}
		return nil, nex.NewError(nex.ResultCodes.Authentication.Unknown, err.Error())
	}

	// requiresTokenAuth = false: nuestras cuentas se autentican con el
	// nex_password derivado directamente, sin token intermedio (fase 1).
	return nex.NewAccount(types.NewPID(pid), username, nexPassword, false), nil
}
