import SwiftUI
import WebKit
import UIKit
import UniformTypeIdentifiers
import WidgetKit
import UserNotifications
#if canImport(FoundationModels)
import FoundationModels
#endif

@main struct BookWizApp: App { @UIApplicationDelegateAdaptor(BookWizAppDelegate.self) private var appDelegate; var body: some Scene { WindowGroup { StudioView().ignoresSafeArea(.container).onOpenURL {url in guard url.scheme=="bookwiz",url.host=="widget" else{return};UserDefaults.standard.set(url.absoluteString,forKey:"BookWizWidgetAction");NotificationCenter.default.post(name:Notification.Name("BookWizWidgetAction"),object:nil)} } } }
final class BookWizAppDelegate:NSObject,UIApplicationDelegate,UNUserNotificationCenterDelegate {
    func application(_ application:UIApplication,didFinishLaunchingWithOptions options:[UIApplication.LaunchOptionsKey:Any]?=nil)->Bool{UNUserNotificationCenter.current().delegate=self;return true}
    func userNotificationCenter(_ center:UNUserNotificationCenter,didReceive response:UNNotificationResponse,withCompletionHandler completionHandler:@escaping()->Void){if response.notification.request.identifier.hasPrefix("bookwiz-writing-"){DispatchQueue.main.async{UserDefaults.standard.set("resume",forKey:"BookWizWidgetAction");NotificationCenter.default.post(name:Notification.Name("BookWizWidgetAction"),object:nil)}};completionHandler()}
    func userNotificationCenter(_ center:UNUserNotificationCenter,willPresent notification:UNNotification,withCompletionHandler completionHandler:@escaping(UNNotificationPresentationOptions)->Void){completionHandler([])}
}
struct StudioView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> StudioController { StudioController() }
    func updateUIViewController(_ controller: StudioController, context: Context) { }
}
final class StudioController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, UIDocumentPickerDelegate {
    private var web: WKWebView!
    private var widgetObserver:NSObjectProtocol?
    private var widgetDeliveryInFlight=false
    private var studioReady=false
    private var server: LocalHTTPServer?
    private let assetCache=NSCache<NSString,NSData>()
    private var darkAppearance=true
    private let readAloud=ReadAloud()
    override var preferredStatusBarStyle:UIStatusBarStyle {darkAppearance ? .lightContent : .darkContent}
    private let companion=PhoneCompanion()
    private let origin=URL(string:"http://127.0.0.1:4318")!
    override func viewDidLoad() {
        super.viewDidLoad(); view.backgroundColor = UIColor(red:23/255,green:24/255,blue:28/255,alpha:1);assetCache.totalCostLimit=24_000_000
        let content=WKUserContentController(); content.add(WeakScriptHandler(self),name:"bookwiz")
        let bridge="""
        window.__bookwizLocalRequests={};window.__bookwizLocalReply=function(id,result,error){var p=window.__bookwizLocalRequests[id];if(!p)return;delete window.__bookwizLocalRequests[id];error?p.reject(new Error(error)):p.resolve(result);};window.__bookwizSpeechRequests={};window.__bookwizSpeechReply=function(id,value,error){var p=window.__bookwizSpeechRequests[id];if(!p)return;delete window.__bookwizSpeechRequests[id];error?p.reject(new Error(error)):p.resolve(value);};window.__bookwizSpeechCall=function(action,payload){return new Promise(function(resolve,reject){var id='speech-'+Date.now()+'-'+Math.random();window.__bookwizSpeechRequests[id]={resolve:resolve,reject:reject};webkit.messageHandlers.bookwiz.postMessage({action:'speech',kind:action,id:id,payload:payload||{}});setTimeout(function(){window.__bookwizSpeechReply(id,null,'The speech engine did not respond. Try another voice.');},action==='voices'?10000:300000);});};window.BookWizHost=Object.freeze({speechVoices:function(){return window.__bookwizSpeechCall('voices');},speakText:function(p){return window.__bookwizSpeechCall('speak',p);},pauseSpeech:function(){webkit.messageHandlers.bookwiz.postMessage({action:'speech',kind:'pause'});},resumeSpeech:function(){webkit.messageHandlers.bookwiz.postMessage({action:'speech',kind:'resume'});},stopSpeech:function(){webkit.messageHandlers.bookwiz.postMessage({action:'speech',kind:'stop'});},localModelStatus:function(){return new Promise(function(resolve,reject){var id='status-'+Date.now()+'-'+Math.random();window.__bookwizLocalRequests[id]={resolve:resolve,reject:reject};webkit.messageHandlers.bookwiz.postMessage({action:'modelStatus',id:id});setTimeout(function(){window.__bookwizLocalReply(id,null,'Device model status is unavailable.');},10000);});},platform:'ios',widgetReady:function(){webkit.messageHandlers.bookwiz.postMessage({action:'widgetReady'});},openBackup:function(){webkit.messageHandlers.bookwiz.postMessage({action:'openBackup'});},scheduleReminders:function(p){webkit.messageHandlers.bookwiz.postMessage({action:'reminders',payload:p});},openSettings:function(){webkit.messageHandlers.bookwiz.postMessage({action:'settings'});},generateText:function(prompt){return new Promise(function(resolve,reject){var id=String(Date.now())+Math.random();window.__bookwizLocalRequests[id]={resolve:resolve,reject:reject};webkit.messageHandlers.bookwiz.postMessage({action:'localModel',id:id,prompt:prompt});setTimeout(function(){window.__bookwizLocalReply(id,null,'The device model took too long. Your draft is saved.');},180000);});},updateWidgets:function(stats){webkit.messageHandlers.bookwiz.postMessage({action:'widgets',stats:stats});},setTheme:function(p){webkit.messageHandlers.bookwiz.postMessage({action:'theme',payload:p});},saveFile:function(p){webkit.messageHandlers.bookwiz.postMessage({action:'save',payload:p});},printHTML:function(html){webkit.messageHandlers.bookwiz.postMessage({action:'print',html:html});},updateStats:function(stats){webkit.messageHandlers.bookwiz.postMessage({action:'stats',stats:stats});},requestWatchNotes:function(){webkit.messageHandlers.bookwiz.postMessage({action:'requestNotes'});},ackWatchNotes:function(ids){webkit.messageHandlers.bookwiz.postMessage({action:'ackNotes',ids:ids});}});
        """
        content.addUserScript(WKUserScript(source:bridge,injectionTime:.atDocumentStart,forMainFrameOnly:true))
        let config=WKWebViewConfiguration();config.userContentController=content;config.websiteDataStore = .default()
        web=WKWebView(frame:.zero,configuration:config);web.navigationDelegate=self;web.uiDelegate=self;web.translatesAutoresizingMaskIntoConstraints=false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(web);NSLayoutConstraint.activate([web.topAnchor.constraint(equalTo:view.topAnchor),web.bottomAnchor.constraint(equalTo:view.bottomAnchor),web.leadingAnchor.constraint(equalTo:view.leadingAnchor),web.trailingAnchor.constraint(equalTo:view.trailingAnchor)])
        readAloud.reply={ [weak self] id,value,error in DispatchQueue.main.async {self?.speechReply(id,value,error)} }
        companion.onNotes={ [weak self] in self?.deliverNotes() };companion.activate();widgetObserver=NotificationCenter.default.addObserver(forName:Notification.Name("BookWizWidgetAction"),object:nil,queue:.main){[weak self]_ in self?.deliverWidgetAction()};startServer()
    }
    private func startServer() {
        guard let root=Bundle.main.url(forResource:"Web",withExtension:nil) else { showError("The bundled writing room is missing.");return }
        let assetCache=self.assetCache
        server=LocalHTTPServer { request in
            guard request.method=="GET" else { return LocalReply(405,"Unsupported method") }
            let raw=request.path.components(separatedBy:"?")[0].removingPercentEncoding ?? ""
            guard !raw.contains("..") else { return LocalReply(403,"Invalid path") }
            let file=root.appendingPathComponent(raw=="/" ? "index.html" : String(raw.drop(while:{$0=="/"})))
            let bytes:Data
            if let cached=assetCache.object(forKey:file.path as NSString) {bytes=cached as Data} else if let loaded=try? Data(contentsOf:file) {bytes=loaded;assetCache.setObject(loaded as NSData,forKey:file.path as NSString,cost:loaded.count)} else {return LocalReply(404,"File not found")}
            let mime=["html":"text/html; charset=utf-8","js":"application/javascript","mjs":"application/javascript","css":"text/css","json":"application/json","webmanifest":"application/json","svg":"image/svg+xml","ttf":"font/ttf","wasm":"application/wasm","png":"image/png"]
            return LocalReply(type:mime[file.pathExtension] ?? "application/octet-stream",data:bytes)
        }
        do { try server?.start(port:4318,loopback:true) { [weak self] error in DispatchQueue.main.async { guard let self=self else{return};if let error=error {self.showError(error.localizedDescription)} else {self.web.load(URLRequest(url:self.origin.appendingPathComponent("index.html"))) } } } } catch {showError(error.localizedDescription)}
    }
    private func showError(_ message:String) { let alert=UIAlertController(title:"Open BookWiz",message:message+" Your saved writing remains on this device.",preferredStyle:.alert);alert.addAction(UIAlertAction(title:"Try again",style:.default){[weak self]_ in self?.server?.stop();self?.startServer()});present(alert,animated:true) }
    func webView(_ webView:WKWebView,didFinish navigation:WKNavigation!) { deliverNotes();deliverWidgetAction() }
    func webView(_ webView:WKWebView,decidePolicyFor action:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void) {
        guard let url=action.request.url else{decisionHandler(.cancel);return}
        if url.scheme=="http" && url.host=="127.0.0.1" && url.port==4318 {decisionHandler(.allow)} else {if action.navigationType == .linkActivated {openExternal(url)};decisionHandler(.cancel)}
    }
    func webView(_ webView:WKWebView,createWebViewWith config:WKWebViewConfiguration,for action:WKNavigationAction,windowFeatures:WKWindowFeatures)->WKWebView? {if let url=action.request.url {openExternal(url)};return nil}
    private func openExternal(_ url:URL) {
        let wallet=url.absoluteString=="bitcoin:36QW21MQQxUK7ohBQnvP5itipe4bFx91Bo" || url.absoluteString=="bitcoin:36QW21MQQxUK7ohBQnvP5itipe4bFx91Bo?label=BookWiz"
        guard url.scheme=="https" || url.scheme=="mailto" || wallet else{return}
        UIApplication.shared.open(url,options:[:]){[weak self] opened in
            if !opened {DispatchQueue.main.async {self?.nativeError("This link could not open. For Bitcoin support, install a compatible wallet or copy the address.")}}
        }
    }
    func userContentController(_ controller:WKUserContentController,didReceive message:WKScriptMessage) {
        guard message.frameInfo.isMainFrame,message.frameInfo.securityOrigin.host=="127.0.0.1",message.frameInfo.securityOrigin.port==4318,let body=message.body as? [String:Any],let action=body["action"] as? String else{return}
        if action=="widgetReady" {studioReady=true;deliverWidgetAction()} else if action=="speech",let kind=body["kind"] as? String {let id=body["id"] as? String ?? "";switch kind {case "voices":speechReply(id,readAloud.voices(),nil);case "speak":readAloud.speak(id,body["payload"] as? [String:Any] ?? [:]);case "pause":readAloud.pause();case "resume":readAloud.resume();case "stop":readAloud.stop();default:break}} else if action=="openBackup" {guard presentedViewController==nil else{nativeError("Close the current sheet before opening a backup.");return};let picker=UIDocumentPickerViewController(forOpeningContentTypes:[.json],asCopy:true);picker.delegate=self;picker.allowsMultipleSelection=false;present(picker,animated:true)} else if action=="reminders",let payload=body["payload"] as? [String:Any] {scheduleReminders(payload)} else if action=="settings" {if let url=URL(string:UIApplication.openSettingsURLString){UIApplication.shared.open(url)}} else if action=="widgets",let stats=body["stats"] as? [String:Any] {
            let allowed:Set<String>=["snapshotAt","titles","title","projectId","chapterId","wordCount","today","goal","books","chapters","sessionEndsAt"];UserDefaults(suiteName:"group.com.muneebwanee.bookwiz")?.set(stats.filter{allowed.contains($0.key)},forKey:"BookWizWidgetData");WidgetCenter.shared.reloadAllTimelines()
        } else if action=="modelStatus",let id=body["id"] as? String {
            Task { @MainActor in
                var available=false
                var detail="Apple Intelligence requires a compatible device with iOS 26 or later."
                #if canImport(FoundationModels)
                if #available(iOS 26.0,*) {
                    if case .available = SystemLanguageModel.default.availability {available=true;detail="The device model is ready."}
                    else {detail="Enable Apple Intelligence and finish its model download in device Settings."}
                }
                #endif
                let payload:[String:Any] = ["id":id,"result":["available":available,"message":detail],"error":NSNull()]
                if let data=try? JSONSerialization.data(withJSONObject:payload),let json=String(data:data,encoding:.utf8){self.web.evaluateJavaScript("(function(p){window.__bookwizLocalReply(p.id,p.result,p.error)})(\(json))",completionHandler:nil)}
            }
        } else if action=="localModel",let id=body["id"] as? String,let prompt=body["prompt"] as? String {
            Task { @MainActor in
                var result:String?;var failure:String?
                #if canImport(FoundationModels)
                if #available(iOS 26.0,*) {
                    if case .available = SystemLanguageModel.default.availability {
                        do {let session=LanguageModelSession(instructions:"You are a careful writing assistant. Return original prose and preserve the supplied facts.");result=try await session.respond(to:prompt).content} catch {failure="The device model could not finish. Use a shorter context or another model."}
                    } else {failure="Apple Intelligence is unavailable. Check device compatibility, language, region, downloaded models and Apple Intelligence settings."}
                } else {failure="The device model requires iOS 26 or later and Apple Intelligence."}
                #else
                failure="The device model is unavailable in this installation."
                #endif
                let payload:[String:Any] = ["id":id,"result":result.map{$0 as Any} ?? NSNull(),"error":failure.map{$0 as Any} ?? NSNull()]
                if let data=try? JSONSerialization.data(withJSONObject:payload),let json=String(data:data,encoding:.utf8){self.web.evaluateJavaScript("(function(p){window.__bookwizLocalReply(p.id,p.result,p.error)})(\(json))",completionHandler:nil)}
            }
        } else if action=="theme",let payload=body["payload"] as? [String:Any],let hex=payload["background"] as? String,hex.count==7,hex.first=="#",let value=UInt32(hex.dropFirst(),radix:16) {
            let color=UIColor(red:CGFloat((value>>16)&255)/255,green:CGFloat((value>>8)&255)/255,blue:CGFloat(value&255)/255,alpha:1)
            darkAppearance=payload["dark"] as? Bool ?? true;view.backgroundColor=color;web.backgroundColor=color;web.scrollView.backgroundColor=color;overrideUserInterfaceStyle=darkAppearance ? .dark : .light;view.window?.overrideUserInterfaceStyle=darkAppearance ? .dark : .light;setNeedsStatusBarAppearanceUpdate()
        } else if action=="save",let payload=body["payload"] as? [String:Any],let base64=payload["base64"] as? String,base64.count<90_000_000,let data=Data(base64Encoded:base64) {
            let name=((payload["name"] as? String) ?? "BookWiz-export").replacingOccurrences(of:"/",with:"_").replacingOccurrences(of:":",with:"_")
            let url=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString+"-"+name)
            do {try data.write(to:url,options:.atomic);let sheet=UIActivityViewController(activityItems:[url],applicationActivities:nil);sheet.popoverPresentationController?.sourceView=view;sheet.popoverPresentationController?.sourceRect=CGRect(x:view.bounds.midX,y:view.bounds.midY,width:1,height:1);present(sheet,animated:true)} catch {nativeError("The export could not be prepared.")}
        } else if action=="print",let html=body["html"] as? String,html.count<20_000_000 {
            let print=UIPrintInteractionController.shared;let info=UIPrintInfo(dictionary:nil);info.jobName="BookWiz manuscript";info.outputType = .general;print.printInfo=info;print.printFormatter=UIMarkupTextPrintFormatter(markupText:html);if UIDevice.current.userInterfaceIdiom == .pad {print.present(from:CGRect(x:view.bounds.midX,y:view.bounds.midY,width:1,height:1),in:view,animated:true,completionHandler:nil)} else {print.present(animated:true,completionHandler:nil)}
        } else if action=="requestNotes" {deliverNotes()} else if action=="stats",let stats=body["stats"] as? [String:Any] {companion.update(stats)} else if action=="ackNotes",let ids=body["ids"] as? [String] {companion.acknowledge(ids)}
    }
    private func speechReply(_ id:String,_ value:Any?,_ error:String?){let payload:[String:Any] = ["id":id,"value":value ?? NSNull(),"error":error.map{$0 as Any} ?? NSNull()];guard let data=try? JSONSerialization.data(withJSONObject:payload),let json=String(data:data,encoding:.utf8) else{return};web.evaluateJavaScript("(function(p){window.__bookwizSpeechReply(p.id,p.value,p.error)})(\(json))",completionHandler:nil)}
    func documentPicker(_ controller:UIDocumentPickerViewController,didPickDocumentsAt urls:[URL]){
        guard let url=urls.first else{return};let scoped=url.startAccessingSecurityScopedResource();defer{if scoped{url.stopAccessingSecurityScopedResource()}}
        do {let size=try url.resourceValues(forKeys:[.fileSizeKey]).fileSize ?? 0;guard size<=30*1024*1024 else{nativeError("Choose a backup smaller than 30 MB.");return};let data=try Data(contentsOf:url);guard data.count<=30*1024*1024,let text=String(data:data,encoding:.utf8) else{nativeError("Choose a BookWiz JSON backup under 30 MB.");return};let payload=try JSONSerialization.data(withJSONObject:["text":text]);if let json=String(data:payload,encoding:.utf8){web.evaluateJavaScript("window.dispatchEvent(new CustomEvent('bookwiz-open-backup',{detail:\(json)}))",completionHandler:nil)}}catch{nativeError("The backup could not be read. Your saved books are unchanged.")}
    }
    private func reminderStatus(_ status:String,_ enabled:Bool){DispatchQueue.main.async {self.web.evaluateJavaScript("window.dispatchEvent(new CustomEvent('bookwiz-reminder-status',{detail:{status:'\(status)',enabled:\(enabled)}}))",completionHandler:nil)}}
    private func scheduleReminders(_ payload:[String:Any]){
        Task { @MainActor in
            let center=UNUserNotificationCenter.current()
            let pending=await center.pendingNotificationRequests()
            center.removePendingNotificationRequests(withIdentifiers:pending.filter{$0.identifier.hasPrefix("bookwiz-writing-")}.map{$0.identifier})
            center.removeDeliveredNotifications(withIdentifiers:(700..<714).map{"bookwiz-writing-\($0)"})
            guard payload["enabled"] as? Bool == true else{reminderStatus("granted",false);return}
            let settings=await center.notificationSettings()
            var allowed=settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
            if settings.authorizationStatus == .notDetermined && payload["requestPermission"] as? Bool == true{allowed=(try? await center.requestAuthorization(options:[.alert])) ?? false}
            guard allowed else{reminderStatus("denied",false);return}
            do {
                for plan in (payload["plans"] as? [[String:Any]] ?? []).prefix(14){
                    guard let at=plan["at"] as? Double,at>Date().timeIntervalSince1970*1000,let id=plan["id"] as? Int,let text=plan["body"] as? String else{continue}
                    let content=UNMutableNotificationContent();content.title="A little room for your words";content.body=String(text.prefix(400));content.userInfo=["action":"resume"];content.threadIdentifier="bookwiz-writing"
                    let date=Date(timeIntervalSince1970:at/1000),parts=Calendar.current.dateComponents([.year,.month,.day,.hour,.minute],from:date)
                    try await center.add(UNNotificationRequest(identifier:"bookwiz-writing-\(id)",content:content,trigger:UNCalendarNotificationTrigger(dateMatching:parts,repeats:false)))
                }
                reminderStatus("granted",true)
            } catch {center.removePendingNotificationRequests(withIdentifiers:(700..<714).map{"bookwiz-writing-\($0)"});reminderStatus("error",false)}
        }
    }
    private func nativeError(_ text:String) {guard let data=try? JSONSerialization.data(withJSONObject:["message":text]),let json=String(data:data,encoding:.utf8) else{return};web.evaluateJavaScript("window.dispatchEvent(new CustomEvent('bookwiz-native-error',{detail:(\(json)).message}))")}
    private func deliverNotes() {let notes=companion.pending();guard !notes.isEmpty,let data=try? JSONSerialization.data(withJSONObject:notes),let json=String(data:data,encoding:.utf8) else{return};web?.evaluateJavaScript("window.dispatchEvent(new CustomEvent('bookwiz-watch-notes',{detail:\(json)}))")}
    func webView(_ webView:WKWebView,didStartProvisionalNavigation navigation:WKNavigation!){studioReady=false}
    private func deliverWidgetAction(){
        guard web != nil,studioReady,!web.isLoading,!widgetDeliveryInFlight,let value=UserDefaults.standard.string(forKey:"BookWizWidgetAction") else{return}
        var detail:[String:String]=["action":value]
        if let url=URLComponents(string:value),url.scheme=="bookwiz",url.host=="widget" {
            detail["action"]=URL(string:value)?.lastPathComponent ?? ""
            for item in url.queryItems ?? [] {if ["projectId","chapterId"].contains(item.name){detail[item.name]=item.value ?? ""}}
        }
        guard let data=try? JSONSerialization.data(withJSONObject:detail),let json=String(data:data,encoding:.utf8) else{return}
        widgetDeliveryInFlight=true
        web.evaluateJavaScript("(function(){if(!window.BookWizWidgetReady)return false;window.dispatchEvent(new CustomEvent('bookwiz-widget-action',{detail:\(json)}));return true;})()") { [weak self] result,_ in
            guard let self=self else{return};self.widgetDeliveryInFlight=false
            let current=UserDefaults.standard.string(forKey:"BookWizWidgetAction")
            if result as? Bool == true,current==value {UserDefaults.standard.removeObject(forKey:"BookWizWidgetAction")}
            if current != nil,current != value {self.deliverWidgetAction()}
        }
    }
    deinit {readAloud.stop();if let observer=widgetObserver{NotificationCenter.default.removeObserver(observer)};web?.configuration.userContentController.removeScriptMessageHandler(forName:"bookwiz");server?.stop()}
}

private final class WeakScriptHandler:NSObject,WKScriptMessageHandler {weak var delegate:WKScriptMessageHandler?;init(_ delegate:WKScriptMessageHandler){self.delegate=delegate};func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage){delegate?.userContentController(userContentController,didReceive:message)}}
