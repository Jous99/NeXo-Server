// Package authserver implements the NEX4+ ValidateAndRequestTicketWithParam
// handler used by Switch titles (Login/LoginWithContext method 6 once the
// endpoint's library version is >= 4.0.0 — see ticket-granting/protocol.go
// in nex-protocols-go/v2).
//
// nex-protocols-common-go/v2's ticket-granting CommonProtocol only wires the
// legacy Login/LoginEx/RequestTicket handlers (NEX <4). It does not yet cover
// ValidateAndRequestTicketWithParam, so this package reimplements the same
// Kerberos ticket generation nex-protocols-common-go/v2/ticket-granting uses
// internally (its generateTicket is unexported), using nex-go's own exported
// primitives (DeriveKerberosKey, KerberosTicket, KerberosTicketInternalData).
package authserver

import (
	"crypto/rand"
	"fmt"
	"log"

	nex "github.com/PretendoNetwork/nex-go/v2"
	"github.com/PretendoNetwork/nex-go/v2/types"
	ticket_granting "github.com/PretendoNetwork/nex-protocols-go/v2/ticket-granting"
	ticket_granting_types "github.com/PretendoNetwork/nex-protocols-go/v2/ticket-granting/types"
)

// AccountLookup matches accounts.Store's ByUsername method — kept as an
// interface so this package doesn't need to import accounts directly.
type AccountLookup interface {
	ByUsername(username string) (*nex.Account, *nex.Error)
}

// Config holds everything needed to issue tickets for one game/title.
type Config struct {
	// SecureServerAccount is the pseudo-account representing the game's
	// secure (gameplay) server. The ticket is encrypted so only whoever
	// holds this account's password can decrypt it.
	SecureServerAccount *nex.Account
	// SecureStationURL is where the client should connect next to reach
	// the secure server. NOTE: today this still points at the existing
	// Node TCP module (mk8/nex_tcp.js) as a bridge — see nex-server/README.md.
	// A real Switch will not complete a full connection until that server
	// also speaks real UDP PRUDP (a later phase), even though the ticket
	// issued here is fully real.
	SecureStationURL types.StationURL
	BuildName        string
	SessionKeyLength int
}

// NewValidateAndRequestTicketWithParamHandler builds the RMC handler for
// TicketGranting::ValidateAndRequestTicketWithParam (proto 10, method 6).
func NewValidateAndRequestTicketWithParamHandler(lookup AccountLookup, cfg *Config) func(
	err error,
	packet nex.PacketInterface,
	callID uint32,
	param ticket_granting_types.ValidateAndRequestTicketParam,
) (*nex.RMCMessage, *nex.Error) {
	return func(
		reqErr error,
		packet nex.PacketInterface,
		callID uint32,
		param ticket_granting_types.ValidateAndRequestTicketParam,
	) (*nex.RMCMessage, *nex.Error) {
		if reqErr != nil {
			return nil, nex.NewError(nex.ResultCodes.Core.InvalidArgument, reqErr.Error())
		}

		connection := packet.Sender().(*nex.PRUDPConnection)
		endpoint := connection.Endpoint().(*nex.PRUDPEndPoint)

		log.Printf("[auth] ValidateAndRequestTicketWithParam recibido: username=%q", string(param.Username))

		source, accErr := lookup.ByUsername(string(param.Username))
		if accErr != nil {
			log.Printf("[auth] ❌ lookup de cuenta FALLÓ para username=%q: %v", string(param.Username), accErr)
			return nil, accErr
		}
		log.Printf("[auth] ✓ cuenta encontrada (PID=%d) — emitiendo ticket Kerberos...", source.PID)

		encryptedTicket, tErr := issueTicket(endpoint, source, cfg)
		if tErr != nil {
			log.Printf("[auth] ❌ fallo emitiendo ticket para PID=%d: %v", source.PID, tErr)
			return nil, tErr
		}
		log.Printf("[auth] ✅ ticket emitido para PID=%d — SecureStationURL=%s", source.PID, cfg.SecureStationURL)

		result := ticket_granting_types.NewValidateAndRequestTicketResult()
		result.SourcePID = source.PID
		result.BufResponse = types.NewBuffer(encryptedTicket)
		result.ServiceNodeURL = cfg.SecureStationURL
		result.CurrentUTCTime = types.NewDateTime(0).Now()
		result.ReturnMsg = types.NewString(cfg.BuildName)
		result.SourceKey = types.NewString("") // fase 1: sin auth por token, ver Store.lookup

		stream := nex.NewByteStreamOut(endpoint.LibraryVersions(), endpoint.ByteStreamSettings())
		result.WriteTo(stream)

		response := nex.NewRMCSuccess(endpoint, stream.Bytes())
		response.ProtocolID = ticket_granting.ProtocolID
		response.MethodID = ticket_granting.MethodLoginWithContext
		response.CallID = callID

		return response, nil
	}
}

// issueTicket mirrors nex-protocols-common-go/v2/ticket-granting's unexported
// generateTicket — same Kerberos flow, just reimplemented here since that
// function isn't exported and this package can't import it directly.
func issueTicket(endpoint *nex.PRUDPEndPoint, source *nex.Account, cfg *Config) ([]byte, *nex.Error) {
	target := cfg.SecureServerAccount

	sourceKey := nex.DeriveKerberosKey(source.PID, []byte(source.Password))
	targetKey := nex.DeriveKerberosKey(target.PID, []byte(target.Password))

	sessionKey := make([]byte, cfg.SessionKeyLength)
	if _, err := rand.Read(sessionKey); err != nil {
		return nil, nex.NewError(nex.ResultCodes.Authentication.Unknown, "failed to generate session key")
	}

	internalData := nex.NewKerberosTicketInternalData(endpoint.Server)
	internalData.Issued = types.NewDateTime(0).Now()
	internalData.SourcePID = source.PID
	internalData.SessionKey = sessionKey

	encryptedInternalData, err := internalData.Encrypt(targetKey, nex.NewByteStreamOut(endpoint.LibraryVersions(), endpoint.ByteStreamSettings()))
	if err != nil {
		return nil, nex.NewError(nex.ResultCodes.Authentication.Unknown, fmt.Sprintf("failed to encrypt ticket internal data: %s", err))
	}

	ticket := nex.NewKerberosTicket()
	ticket.SessionKey = sessionKey
	ticket.TargetPID = target.PID
	ticket.InternalData = types.NewBuffer(encryptedInternalData)

	encryptedTicket, err := ticket.Encrypt(sourceKey, nex.NewByteStreamOut(endpoint.LibraryVersions(), endpoint.ByteStreamSettings()))
	if err != nil {
		return nil, nex.NewError(nex.ResultCodes.Authentication.Unknown, fmt.Sprintf("failed to encrypt ticket: %s", err))
	}

	return encryptedTicket, nil
}
