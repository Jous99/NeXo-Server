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

// issueTicketZeroKey es como issueTicket pero cifra el ticket con una clave de
// ORIGEN a ceros (16 bytes 0x00). El emulador NeXo no entrega credencial NEX al
// juego, así que MK8D usa una clave Kerberos cero (igual que el stub original
// "keys are 0x00"). La clave de DESTINO (del servidor secure) sí se deriva
// normal, porque la usa el servidor secure para leer los datos internos.
func issueTicketZeroKey(endpoint *nex.PRUDPEndPoint, source *nex.Account, cfg *Config) ([]byte, *nex.Error) {
	target := cfg.SecureServerAccount

	sourceKey := make([]byte, 16) // CLAVE CERO
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
		return nil, nex.NewError(nex.ResultCodes.Authentication.Unknown, fmt.Sprintf("failed to encrypt internal data: %s", err))
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

// NewValidateAndRequestTicketWithCustomDataHandler es el handler del método que
// usa MK8 Deluxe (LoginEx en NEX4). Emite el ticket con clave de origen a ceros
// (issueTicketZeroKey) y responde en el MISMO formato que el loginEx del común
// de Pretendo (retval, pid, buffer del ticket, RVConnectionData, msg, sourceKey).
func NewValidateAndRequestTicketWithCustomDataHandler(lookup AccountLookup, cfg *Config) func(
	err error,
	packet nex.PacketInterface,
	callID uint32,
	strUserName types.String,
	oExtraData types.DataHolder,
) (*nex.RMCMessage, *nex.Error) {
	return func(
		reqErr error,
		packet nex.PacketInterface,
		callID uint32,
		strUserName types.String,
		oExtraData types.DataHolder,
	) (*nex.RMCMessage, *nex.Error) {
		if reqErr != nil {
			return nil, nex.NewError(nex.ResultCodes.Core.InvalidArgument, reqErr.Error())
		}

		connection := packet.Sender().(*nex.PRUDPConnection)
		endpoint := connection.Endpoint().(*nex.PRUDPEndPoint)
		server := endpoint.Server

		log.Printf("[auth] (zero-key) WithCustomData username=%q", string(strUserName))

		source, accErr := lookup.ByUsername(string(strUserName))
		if accErr != nil {
			log.Printf("[auth] ❌ cuenta no encontrada para %q: %v", string(strUserName), accErr)
			return nil, accErr
		}

		encryptedTicket, tErr := issueTicketZeroKey(endpoint, source, cfg)
		if tErr != nil {
			log.Printf("[auth] ❌ fallo emitiendo ticket (zero-key): %v", tErr)
			return nil, tErr
		}
		log.Printf("[auth] ✅ ticket (zero-key) emitido para PID=%d, StationURL=%s", source.PID, cfg.SecureStationURL)

		retval := types.NewQResultSuccess(nex.ResultCodes.Core.Unknown)
		pidPrincipal := source.PID
		pbufResponse := types.NewBuffer(encryptedTicket)
		pConnectionData := types.NewRVConnectionData()
		strReturnMsg := types.NewString(cfg.BuildName)
		pSourceKey := types.NewString("")

		pConnectionData.StationURL = cfg.SecureStationURL
		pConnectionData.SpecialProtocols = types.List[types.UInt8]([]types.UInt8{})
		pConnectionData.StationURLSpecialProtocols = types.NewStationURL("")
		pConnectionData.Time = types.NewDateTime(0).Now()
		pConnectionData.StructureVersion = 1

		stream := nex.NewByteStreamOut(endpoint.LibraryVersions(), endpoint.ByteStreamSettings())
		retval.WriteTo(stream)
		pidPrincipal.WriteTo(stream)
		pbufResponse.WriteTo(stream)
		pConnectionData.WriteTo(stream)
		strReturnMsg.WriteTo(stream)
		if server.LibraryVersions.Main.GreaterOrEqual("4.0.0") {
			pSourceKey.WriteTo(stream)
		}

		response := nex.NewRMCSuccess(endpoint, stream.Bytes())
		response.ProtocolID = ticket_granting.ProtocolID
		response.MethodID = ticket_granting.MethodLoginEx
		response.CallID = callID

		return response, nil
	}
}
