import Foundation
import AVFoundation

final class ReadAloud:NSObject,AVSpeechSynthesizerDelegate {
    private let synth=AVSpeechSynthesizer()
    private var request:String?
    private var current:AVSpeechUtterance?
    var reply:((String,Any?,String?)->Void)?
    override init(){super.init();synth.delegate=self}
    func voices()->[[String:Any]] {AVSpeechSynthesisVoice.speechVoices().map{v in ["id":v.identifier,"voiceURI":v.identifier,"name":v.name,"lang":v.language,"localService":true,"quality":v.quality == .premium ? "Premium" : v.quality == .enhanced ? "Enhanced" : "Standard"]}}
    func speak(_ id:String,_ payload:[String:Any]) {
        stop()
        guard let text=payload["text"] as? String,text.count<=5000,let identifier=payload["voice"] as? String,let voice=AVSpeechSynthesisVoice(identifier:identifier) else{reply?(id,nil,"This voice is no longer installed. Choose another voice.");return}
        do {try AVAudioSession.sharedInstance().setCategory(.playback,mode:.spokenAudio,options:[.duckOthers]);try AVAudioSession.sharedInstance().setActive(true)}catch{reply?(id,nil,"Audio playback is unavailable. Check your device’s audio settings.");return}
        request=id;let utterance=AVSpeechUtterance(string:text);current=utterance;utterance.voice=voice;let speed=(payload["rate"] as? Double) ?? 1;utterance.rate=Float(max(0.5,min(1.5,speed)))*AVSpeechUtteranceDefaultSpeechRate;synth.speak(utterance)
    }
    func pause(){synth.pauseSpeaking(at:.word)}
    func resume(){synth.continueSpeaking()}
    func stop(){let old=request;request=nil;current=nil;synth.stopSpeaking(at:.immediate);if let old=old{reply?(old,nil,"Reading stopped.")};try? AVAudioSession.sharedInstance().setActive(false,options:.notifyOthersOnDeactivation)}
    func speechSynthesizer(_ synthesizer:AVSpeechSynthesizer,didFinish utterance:AVSpeechUtterance){guard let id=request,current===utterance else{return};request=nil;current=nil;reply?(id,true,nil);try? AVAudioSession.sharedInstance().setActive(false,options:.notifyOthersOnDeactivation)}
}
