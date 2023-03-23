package constants

type RecordType string
type PacketLoss string

const (
	AppLabel                            = "app"
	AppLabelValue                       = "netobserv-flowcollector"
	RecordTypeLabel                     = "_RecordType"
	RecordTypeAllConnections RecordType = "allConnections"
	RecordTypeNewConnection  RecordType = "newConnection"
	RecordTypeHeartbeat      RecordType = "heartbeat"
	RecordTypeEndConnection  RecordType = "endConnection"
	RecordTypeLog            RecordType = "flowLog"
	PacketLossDropped        PacketLoss = "dropped"
	PacketLossHasDrop        PacketLoss = "hasDrops"
	PacketLossSent           PacketLoss = "sent"
	PacketLossAll            PacketLoss = "all"
	Ingress                             = "0"
	Egress                              = "1"
)

var AnyConnectionType = []string{
	string(RecordTypeAllConnections),
	string(RecordTypeNewConnection),
	string(RecordTypeHeartbeat),
	string(RecordTypeEndConnection),
}

var ConnectionTypes = []string{
	string(RecordTypeNewConnection),
	string(RecordTypeHeartbeat),
	string(RecordTypeEndConnection),
}
