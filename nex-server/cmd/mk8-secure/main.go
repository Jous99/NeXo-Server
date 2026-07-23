// Command mk8-secure is the real NEX "secure" server for Mario Kart 8 Deluxe,
// over real UDP PRUDP. It is where a Switch connects AFTER getting a Kerberos
// ticket from mk8-auth (cmd/mk8-auth). This server validates that ticket with
// the shared secure-server account credentials and then serves the gameplay
// protocols (SecureConnection now; MatchMaking/MatchmakeExtension next — see
// nex-server/README.md and the note about PostgreSQL matchmaking below).
//
// Auth vs. secure:
//   - mk8-auth   (proto 10)  → issues the Kerberos ticket. ServerAccount = "Quazal Authentication".
//   - mk8-secure (this)      → validates the ticket, runs the game. ServerAccount = the secure account (PID 2).
//
// Both share the SAME AccessKey, NEX version and MySQL `users` table so the
// Kerberos session negotiated by the auth server is accepted here.
package main

import (
	"log"
	"os"
	"strconv"
	"strings"

	nex "github.com/PretendoNetwork/nex-go/v2"
	"github.com/PretendoNetwork/nex-go/v2/types"
	common_globals "github.com/PretendoNetwork/nex-protocols-common-go/v2/globals"
	match_making_common "github.com/PretendoNetwork/nex-protocols-common-go/v2/match-making"
	matchmake_ext_common "github.com/PretendoNetwork/nex-protocols-common-go/v2/matchmake-extension"
	secure_connection_common "github.com/PretendoNetwork/nex-protocols-common-go/v2/secure-connection"
	match_making_protocol "github.com/PretendoNetwork/nex-protocols-go/v2/match-making"
	matchmake_ext_protocol "github.com/PretendoNetwork/nex-protocols-go/v2/matchmake-extension"
	secure_connection_protocol "github.com/PretendoNetwork/nex-protocols-go/v2/secure-connection"
	"github.com/joho/godotenv"

	"git.joustech.space/NeXo/Nexo-Server/nex-server/internal/accounts"
	"git.joustech.space/NeXo/Nexo-Server/nex-server/internal/matchmaking"
)

const (
	secureAccountPID      = 2
	secureAccountUsername = "mk8-secure"
)

func main() {
	// El .env vive en la raíz del repo Node, un nivel por encima de nex-server/.
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")

	accessKey := requireEnv("NEXO_MK8_ACCESS_KEY")
	securePassword := requireEnv("NEXO_MK8_SECURE_PASSWORD")

	store, err := accounts.Open(accounts.Config{
		Host:     envOr("DB_HOST", "127.0.0.1"),
		Port:     envOr("DB_PORT", "3306"),
		User:     envOr("DB_USER", "nexo"),
		Password: os.Getenv("DB_PASSWORD"),
		Name:     envOr("DB_NAME", "nexo_network"),
	})
	if err != nil {
		log.Fatalf("no se pudo conectar a MySQL: %v", err)
	}

	// Cuenta del propio servidor secure. El ticket que emite mk8-auth cifra sus
	// datos internos con la clave Kerberos de ESTA cuenta, así que el endpoint
	// necesita la misma password para descifrarlo y aceptar la conexión.
	secureAccount := nex.NewAccount(types.NewPID(secureAccountPID), secureAccountUsername, securePassword, false)
	store.AddSpecialAccount(secureAccount)

	server := nex.NewPRUDPServer()
	server.AccessKey = accessKey
	server.LibraryVersions.SetDefault(parseNEXVersion(envOr("NEXO_MK8_NEX_VERSION", "4.0.0")))

	endpoint := nex.NewPRUDPEndPoint(1)
	// ServerAccount = la cuenta secure → permite descifrar el ticket entrante.
	endpoint.ServerAccount = secureAccount
	endpoint.AccountDetailsByPID = store.ByPID
	endpoint.AccountDetailsByUsername = store.ByUsername
	server.BindPRUDPEndPoint(endpoint)

	// NOTA de orden: los NewCommonProtocol(...) leen protocol.Endpoint() en su
	// constructor, así que hay que RegisterServiceProtocol ANTES de crear el common.

	// ── SecureConnection (proto 11): Register / RegisterEx ────────────────────
	// Primer protocolo que habla el juego tras validar el ticket: registra la
	// StationURL del cliente (su dirección para P2P/notificaciones).
	scProtocol := secure_connection_protocol.NewProtocol()
	endpoint.RegisterServiceProtocol(scProtocol)
	scCommon := secure_connection_common.NewCommonProtocol(scProtocol)
	// Fase 1: cuentas propias, sin validación PN de login-data (ni AES ni token).
	scCommon.ValidateLoginData = func(pid types.PID, loginData types.DataHolder) *nex.Error {
		return nil
	}

	// ── Matchmaking (proto 21 + 109) sobre PostgreSQL ─────────────────────────
	// La matchmaking común de Pretendo usa Postgres (esquemas matchmaking.*/tracking.*
	// que crea sola). Es una base SEPARADA de tu MySQL de cuentas.
	pgDB, err := matchmaking.OpenPostgres(matchmaking.PGConfig{
		Host:     envOr("PG_HOST", "127.0.0.1"),
		Port:     envOr("PG_PORT", "5432"),
		User:     envOr("PG_USER", "nexo"),
		Password: os.Getenv("PG_PASSWORD"),
		Name:     envOr("PG_NAME", "nexo_matchmaking"),
		SSLMode:  envOr("PG_SSLMODE", "disable"),
	})
	if err != nil {
		log.Fatalf("no se pudo conectar a PostgreSQL (matchmaking): %v", err)
	}

	// MatchmakingManager: backend compartido de match-making y matchmake-extension.
	// CONFIRMAR el constructor exacto contra tu versión pinneada (si el nombre o la
	// firma difieren, el error de compilación lo dirá):
	//   go doc github.com/PretendoNetwork/nex-protocols-common-go/v2/globals NewMatchmakingManager
	mmManager := common_globals.NewMatchmakingManager()
	mmManager.Database = pgDB

	// MatchMaking base (proto 21)
	mmProtocol := match_making_protocol.NewProtocol()
	endpoint.RegisterServiceProtocol(mmProtocol)
	mmCommon := match_making_common.NewCommonProtocol(mmProtocol)
	mmCommon.SetManager(mmManager)

	// MatchmakeExtension (proto 109) — el matchmaking real de MK8D
	mmeProtocol := matchmake_ext_protocol.NewProtocol()
	endpoint.RegisterServiceProtocol(mmeProtocol)
	mmeCommon := matchmake_ext_common.NewCommonProtocol(mmeProtocol)
	mmeCommon.SetManager(mmManager)

	port := envIntOr("NEXO_MK8_SECURE_UDP_PORT", 60001)
	v := server.LibraryVersions.Main
	log.Printf("mk8-secure escuchando UDP :%d (access key=%q, NEX %d.%d.%d)", port, accessKey, v.Major, v.Minor, v.Patch)
	server.Listen(port)
}

func parseNEXVersion(v string) *nex.LibraryVersion {
	parts := strings.SplitN(v, ".", 3)
	if len(parts) != 3 {
		log.Fatalf("NEXO_MK8_NEX_VERSION inválido (esperado major.minor.patch): %q", v)
	}
	major, err1 := strconv.Atoi(parts[0])
	minor, err2 := strconv.Atoi(parts[1])
	patch, err3 := strconv.Atoi(parts[2])
	if err1 != nil || err2 != nil || err3 != nil {
		log.Fatalf("NEXO_MK8_NEX_VERSION inválido (esperado major.minor.patch): %q", v)
	}
	return nex.NewLibraryVersion(major, minor, patch)
}

func requireEnv(name string) string {
	v := os.Getenv(name)
	if v == "" {
		log.Fatalf("%s es obligatorio (ver nex-server/README.md)", name)
	}
	return v
}

func envOr(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

func envIntOr(name string, fallback int) int {
	v := os.Getenv(name)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		log.Fatalf("%s debe ser un número: %q", name, v)
	}
	return n
}
