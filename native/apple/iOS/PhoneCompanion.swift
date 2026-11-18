import Foundation
import WatchConnectivity

final class PhoneCompanion: NSObject, WCSessionDelegate {
    var onNotes: (() -> Void)?
    private var lastStats=[String:Any]()
    private let key="BookWizPendingWatchNotes"
    func activate() {guard WCSession.isSupported() else{return};WCSession.default.delegate=self;WCSession.default.activate()}
    func update(_ stats:[String:Any]) {lastStats=stats;guard WCSession.isSupported(),WCSession.default.activationState == .activated,WCSession.default.isPaired else{return};let safe:[String:Any]=["projectId":stats["projectId"] as? String ?? "","title":stats["title"] as? String ?? "","wordCount":stats["wordCount"] as? Int ?? 0,"updated":Date().timeIntervalSince1970];try? WCSession.default.updateApplicationContext(safe)}
    func pending()->[[String:Any]] {UserDefaults.standard.array(forKey:key) as? [[String:Any]] ?? []}
    func acknowledge(_ ids:[String]) {UserDefaults.standard.set(pending().filter{!ids.contains($0["id"] as? String ?? "")},forKey:key)}
    private func receive(_ payload:[String:Any]) {guard let id=payload["id"] as? String,let text=payload["text"] as? String,!text.isEmpty,text.count<=20000 else{return};DispatchQueue.main.async {var items=self.pending();if !items.contains(where:{$0["id"] as? String==id}){items.append(["id":id,"text":text,"projectId":payload["projectId"] as? String ?? "","date":payload["date"] as? Double ?? Date().timeIntervalSince1970]);UserDefaults.standard.set(items,forKey:self.key)};self.onNotes?()}}
    func session(_ session:WCSession,activationDidCompleteWith state:WCSessionActivationState,error:Error?) {DispatchQueue.main.async{if !self.lastStats.isEmpty{self.update(self.lastStats)}}}
    func sessionDidBecomeInactive(_ session:WCSession) { }
    func sessionDidDeactivate(_ session:WCSession) {session.activate()}
    func session(_ session:WCSession,didReceiveUserInfo userInfo:[String:Any]) {receive(userInfo)}
    func session(_ session:WCSession,didReceiveMessage message:[String:Any]) {receive(message)}
}
