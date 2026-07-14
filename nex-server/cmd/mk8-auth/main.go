// Command mk8-auth is the real NEX ticket-granting server for Mario Kart 8
// Deluxe, replacing the hardcoded zero-key ticket previously served by
// src/modules/games/mk8/nex_tcp.js (proto 10, method 6). It listens on real
// UDP PRUDP, backed by per-account NEX credentials in the same MySQL `users`
// table Node uses. See nex-server/README.md for scope and required config.
package main

import (
	"log"
	"os"
	"strconv"
	"strings"

	nex "github.com/PretendoNetwork/nex-go/v2"
	"github.com/PretendoNetwork/nex-go/v2/types"
	ticket_granting_common "github.com/PretendoNetwork/nex-protocols-common-go/v2/ticket-granting"
	ticket_granting_protocol "github.com/PretendoNetwork/nex-protocols-go/v2/ticket-granting"
	"github.com/joho/godotenv"

	"git.joustech.space/NeXo/Nexo-Server/nex-server/internal/accounts"
	"git.joustech.space/NeXo/Nexo-Server/nex-server/internal/authserver"
)

const secureAccountUsername = "mk8-secure"

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

	// Cuenta especial que representa el servidor "secure" de MK8 (hoy:
	// src/modules/games/mk8/nex_tcp.js — ver caveat de transporte en el README).
	secureAccount := nex.NewAccount(types.NewPID(2), secureAccountUsername, securePassword, false)
	store.AddSpecialAccount(secureAccount)

	server := nex.NewPRUDPServer()
	server.AccessKey = accessKey
	server.LibraryVersions.SetDefault(parseNEXVersion(envOr("NEXO_MK8_NEX_VERSION", "4.0.0")))

	endpoint := nex.NewPRUDPEndPoint(1)
	endpoint.AccountDetailsByPID = store.ByPID
	endpoint.AccountDetailsByUsername = store.ByUsername
	server.BindPRUDPEndPoint(endpoint)

	protocol := ticket_granting_protocol.NewProtocol()

	commonProtocol := ticket_granting_common.NewCommonProtocol(protocol)
	commonProtocol.SecureServerAccount = secureAccount
	commonProtocol.BuildName = types.NewString("NeXo MK8")
	commonProtocol.SecureStationURL = types.NewStationURL(types.String(secureStationURL()))
	// Fase 1: nuestras propias cuentas no necesitan validación extra de
	// login-data (ni Pretendo AES ni token) — ver accounts.Store.lookup.
	commonProtocol.ValidateLoginData = func(pid types.PID, loginData types.DataHolder) *nex.Error {
		return nil
	}

	// NEX4+ (Switch): nex-protocols-common-go/v2 todavía no implementa este
	// método — ver internal/authserver/ticket.go.
	protocol.SetHandlerValidateAndRequestTicketWithParam(
		authserver.NewValidateAndRequestTicketWithParamHandler(store, &authserver.Config{
			SecureServerAccount: secureAccount,
			SecureStationURL:    commonProtocol.SecureStationURL,
			BuildName:           string(commonProtocol.BuildName),
			SessionKeyLength:    commonProtocol.SessionKeyLength,
		}),
	)

	endpoint.RegisterServiceProtocol(protocol)

	port := envIntOr("NEXO_MK8_AUTH_UDP_PORT", 60000)
	v := server.LibraryVersions.Main
	log.Printf("mk8-auth escuchando UDP :%d (access key=%q, NEX version=%d.%d.%d)", port, accessKey, v.Major, v.Minor, v.Patch)
	server.Listen(port)
}

func secureStationURL() string {
	host := envOr("NEXO_TCP_HOST", "127.0.0.1")
	port := envOr("NEXO_MK8_TCP_PORT", "29900")
	return "prudps:/address=" + host + ";port=" + port + ";CID=1;PID=2;sid=1;stream=10;type=2"
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
		log.Fatalf("%s es obligatorio (ver nex-server/README.md) — no confirmado todavía para MK8D real", name)
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
