import SwiftUI
import WatchConnectivity

struct CapturedThought: Codable, Identifiable { let id: String; let text: String; let projectId: String; let date: Double; var sent: Bool }
final class WatchNotebook: NSObject, ObservableObject, WCSessionDelegate {
    @Published var title="Your writing room"
    @Published var wordCount=0
    @Published var thoughts=[CapturedThought]()
    private var projectId=""
    private var inFlight=Set<String>()
    override init() {super.init();if let data=UserDefaults.standard.data(forKey:"BookWizThoughts"),let items=try? JSONDecoder().decode([CapturedThought].self,from:data){thoughts=items};if WCSession.isSupported(){WCSession.default.delegate=self;WCSession.default.activate()}}
    func capture(_ text:String) {let clean=String(text.trimmingCharacters(in:.whitespacesAndNewlines).prefix(20000));guard !clean.isEmpty else{return};thoughts.insert(CapturedThought(id:UUID().uuidString,text:clean,projectId:projectId,date:Date().timeIntervalSince1970,sent:false),at:0);persist();sendPending()}
    func remove(at offsets:IndexSet) {thoughts.remove(atOffsets:offsets);persist()}
    func retryPending() {sendPending()}
    private func persist() {if let data=try? JSONEncoder().encode(thoughts){UserDefaults.standard.set(data,forKey:"BookWizThoughts")}}
    private func sendPending() {guard WCSession.isSupported(),WCSession.default.activationState == .activated else{return};for item in thoughts where !item.sent && !inFlight.contains(item.id) {inFlight.insert(item.id);WCSession.default.transferUserInfo(["id":item.id,"text":item.text,"projectId":item.projectId,"date":item.date])}}
    private func update(_ context:[String:Any]) {DispatchQueue.main.async {self.title=context["title"] as? String ?? "Your writing room";self.projectId=context["projectId"] as? String ?? "";self.wordCount=context["wordCount"] as? Int ?? 0}}
    func session(_ session:WCSession,activationDidCompleteWith state:WCSessionActivationState,error:Error?) {update(session.receivedApplicationContext);DispatchQueue.main.async{self.sendPending()}}
    func session(_ session:WCSession,didReceiveApplicationContext applicationContext:[String:Any]) {update(applicationContext)}
    func session(_ session:WCSession,didFinish userInfoTransfer:WCSessionUserInfoTransfer,error:Error?) {guard let id=userInfoTransfer.userInfo["id"] as? String else{return};DispatchQueue.main.async {self.inFlight.remove(id);if error==nil,let index=self.thoughts.firstIndex(where:{$0.id==id}){self.thoughts[index].sent=true;self.persist()}}}
}
@main struct BookWizWatchApp: App {
    @StateObject private var notebook=WatchNotebook()
    var body: some Scene {WindowGroup {WatchWritingRoom(notebook:notebook)}}
}
struct WatchWritingRoom: View {
    @ObservedObject var notebook:WatchNotebook
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var thought=""
    private let accent=Color(red:0.82,green:0.47,blue:0.36)
    private var pending:Int {notebook.thoughts.filter{!$0.sent}.count}
    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment:.leading,spacing:10) {
                        Label("Your writing room",systemImage:"book.closed").font(.caption2).foregroundStyle(accent)
                        Text(notebook.title.isEmpty ? "A book in the making" : notebook.title)
                            .font(.system(.headline,design:.serif)).fixedSize(horizontal:false,vertical:true)
                        HStack(alignment:.firstTextBaseline,spacing:6) {
                            Text(notebook.wordCount.formatted()).font(.system(size:34,weight:.medium,design:.rounded))
                                .monospacedDigit().contentTransition(.numericText())
                            Text("words").font(.caption).foregroundStyle(.secondary)
                        }
                        Text("Progress from your paired iPhone.").font(.caption2).foregroundStyle(.secondary)
                    }
                    .padding(.vertical,6)
                    .animation(reduceMotion ? nil : .spring(response:0.4,dampingFraction:1),value:notebook.wordCount)
                }
                Section("Catch a thought") {
                    TextField("What came to mind?",text:$thought)
                        .accessibilityLabel("Your thought")
                    Button {
                        withAnimation(reduceMotion ? nil : .spring(response:0.35,dampingFraction:1)) {
                            notebook.capture(thought)
                            thought=""
                        }
                    } label: {Label("Keep & send",systemImage:"paperplane")}
                    .buttonStyle(.borderedProminent).tint(accent)
                    .disabled(thought.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty)
                    Text("Use dictation or the keyboard. Your thought is kept here, then sent to iPhone when connected.")
                        .font(.caption2).foregroundStyle(.secondary)
                }
                Section {
                    if notebook.thoughts.isEmpty {
                        VStack(alignment:.leading,spacing:8) {
                            Image(systemName:"text.badge.plus").font(.title3).foregroundStyle(accent)
                            Text("Room for a passing thought.").font(.system(.body,design:.serif))
                            Text("Your captures will appear here.").font(.caption2).foregroundStyle(.secondary)
                        }.padding(.vertical,5)
                    }
                    ForEach(notebook.thoughts) { item in
                        VStack(alignment:.leading,spacing:9) {
                            Text(item.text).font(.body).fixedSize(horizontal:false,vertical:true)
                            Label(item.sent ? "Sent to iPhone" : "Waiting for iPhone",systemImage:item.sent ? "checkmark.circle" : "clock")
                                .font(.caption2).foregroundStyle(item.sent ? accent : Color.secondary)
                            Text(Date(timeIntervalSince1970:item.date),style:.date).font(.caption2).foregroundStyle(.secondary)
                        }.padding(.vertical,5)
                    }.onDelete(perform:notebook.remove)
                    if pending>0 {
                        Button {notebook.retryPending()} label: {Label("Retry pending captures",systemImage:"arrow.clockwise")}
                            .font(.caption).tint(accent)
                    }
                } header: {Text("Your captures")} footer: {
                    if !notebook.thoughts.isEmpty {Text("Swipe a capture to remove it from this watch.")}
                }
            }
            .navigationTitle("BookWiz")
            .tint(accent)
        }
    }
}
