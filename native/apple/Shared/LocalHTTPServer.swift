import Foundation
import Network

struct LocalRequest { let method: String; let path: String; let headers: [String: String]; let body: Data }
struct LocalReply { let status: Int; let type: String; let body: Data
    init(_ status: Int = 200, _ text: String) { self.status=status; self.type="text/plain; charset=utf-8"; self.body=Data(text.utf8) }
    init(status: Int = 200, type: String, data: Data) { self.status=status; self.type=type; self.body=data }
}
final class LocalHTTPServer: @unchecked Sendable {
    private var listener: NWListener?
    private let queue = DispatchQueue(label: "com.muneebwanee.bookwiz.local-server")
    private let handler: (LocalRequest) -> LocalReply
    init(handler: @escaping (LocalRequest) -> LocalReply) { self.handler=handler }
    func start(port: UInt16, loopback: Bool, ready: @escaping (Error?) -> Void) throws {
        let parameters = NWParameters.tcp
        if loopback { parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: port)!) }
        let listener: NWListener
        if loopback { listener = try NWListener(using: parameters) } else { listener = try NWListener(using: parameters, on: NWEndpoint.Port(rawValue: port)!) }
        self.listener=listener
        listener.stateUpdateHandler = { state in switch state { case .ready: ready(nil); case .failed(let error): ready(error); default: break } }
        listener.newConnectionHandler = { [weak self] connection in connection.start(queue: self?.queue ?? .global()); self?.receive(connection, accumulated: Data()) }
        listener.start(queue: queue)
    }
    func stop() { listener?.cancel(); listener=nil }
    private func receive(_ connection: NWConnection, accumulated: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, complete, error in
            guard let self=self else { connection.cancel(); return }
            var buffer=accumulated; if let data=data { buffer.append(data) }
            guard buffer.count <= 35_000_000 else { self.send(LocalReply(413,"Request too large"), connection); return }
            guard let separator=buffer.range(of: Data("\r\n\r\n".utf8)) else { if buffer.count>16384 || complete || error != nil { connection.cancel() } else { self.receive(connection, accumulated: buffer) }; return }
            guard let head=String(data: buffer[..<separator.lowerBound],encoding:.utf8) else { connection.cancel(); return }
            let lines=head.components(separatedBy:"\r\n"); let first=(lines.first ?? "").split(separator:" ")
            guard first.count>=2 else { connection.cancel(); return }
            var headers=[String:String](); for line in lines.dropFirst() { if let colon=line.firstIndex(of:":") { headers[String(line[..<colon]).lowercased()]=String(line[line.index(after:colon)...]).trimmingCharacters(in:.whitespaces) } }
            let size=Int(headers["content-length"] ?? "0") ?? 0
            guard size>=0 && size<=30_000_000 else { self.send(LocalReply(413,"Request too large"),connection); return }
            let body=buffer[separator.upperBound...]
            if body.count<size { if complete || error != nil { connection.cancel() } else { self.receive(connection, accumulated:buffer) }; return }
            let request=LocalRequest(method:String(first[0]),path:String(first[1]),headers:headers,body:Data(body.prefix(size)))
            self.send(self.handler(request),connection)
        }
    }
    private func send(_ reply: LocalReply, _ connection: NWConnection) {
        let reason=reply.status==200 ? "OK" : "Request failed"
        let headers="HTTP/1.1 \(reply.status) \(reason)\r\nContent-Type: \(reply.type)\r\nContent-Length: \(reply.body.count)\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n"
        var output=Data(headers.utf8); output.append(reply.body)
        connection.send(content:output,completion:.contentProcessed { _ in connection.cancel() })
    }
    deinit { stop() }
}
