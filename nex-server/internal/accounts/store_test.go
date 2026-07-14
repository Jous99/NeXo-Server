package accounts

import (
	"os"
	"testing"

	"github.com/PretendoNetwork/nex-go/v2/types"
)

// Requiere una MySQL/MariaDB local con schema.sql aplicado y al menos una
// cuenta registrada vía Node (ver nex-server/README.md, sección Verificación).
// Se salta automáticamente si no hay DB_* configuradas.
func testStore(t *testing.T) *Store {
	t.Helper()

	host := os.Getenv("DB_HOST")
	if host == "" {
		t.Skip("DB_HOST no configurado — saltando test de integración con MySQL")
	}

	store, err := Open(Config{
		Host:     host,
		Port:     envOr("DB_PORT", "3306"),
		User:     envOr("DB_USER", "nexo"),
		Password: os.Getenv("DB_PASSWORD"),
		Name:     envOr("DB_NAME", "nexo_network"),
	})
	if err != nil {
		t.Fatalf("no se pudo conectar a MySQL: %v", err)
	}

	return store
}

func envOr(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

// TestByUsernameReturnsRealAccount es la prueba central de esta fase: que el
// PID devuelto para una cuenta real es su id de MySQL, NO el valor
// hardcodeado (0x9C900A47) que servía antes mk8/nex_tcp.js, y que
// nex_password viaja tal cual desde la DB (es la clave Kerberos).
func TestByUsernameReturnsRealAccount(t *testing.T) {
	store := testStore(t)

	username := envOr("TEST_MK8_USERNAME", "mk8tester")

	account, nexErr := store.ByUsername(username)
	if nexErr != nil {
		t.Fatalf("ByUsername(%q) falló: %v", username, nexErr)
	}

	const hardcodedLegacyPID = 0x9C900A47
	if uint64(account.PID) == hardcodedLegacyPID {
		t.Fatalf("PID sigue siendo el valor hardcodeado legacy (0x9C900A47) — el bug que esto arregla sigue presente")
	}
	if account.PID == 0 {
		t.Fatalf("PID vino en 0 — esperaba el id real de la cuenta en MySQL")
	}
	if account.Password == "" {
		t.Fatalf("nex_password vino vacío — la cuenta de prueba necesita haberse registrado vía /auth/register")
	}
	if string(account.Username) != username {
		t.Fatalf("username = %q, esperaba %q", account.Username, username)
	}

	t.Logf("cuenta real resuelta: PID=%d username=%q (nex_password presente: %v)", account.PID, account.Username, account.Password != "")

	// ByPID debe resolver a la misma cuenta.
	byPID, nexErr := store.ByPID(types.PID(account.PID))
	if nexErr != nil {
		t.Fatalf("ByPID(%d) falló: %v", account.PID, nexErr)
	}
	if byPID.Username != account.Username {
		t.Fatalf("ByPID devolvió username=%q, esperaba %q", byPID.Username, account.Username)
	}
}

func TestByUsernameUnknownAccount(t *testing.T) {
	store := testStore(t)

	_, nexErr := store.ByUsername("cuenta-que-no-existe-xyz")
	if nexErr == nil {
		t.Fatal("esperaba error para una cuenta inexistente, no lo hubo")
	}
}
