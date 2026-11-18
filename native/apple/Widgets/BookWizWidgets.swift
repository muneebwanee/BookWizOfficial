import SwiftUI
import WidgetKit

struct ShelfEntry: TimelineEntry {let date:Date;let title:String;let words:Int;let today:Int;let goal:Int;let books:Int;let chapters:Int;let sessionEnd:Date?}
struct ShelfProvider:TimelineProvider {
    func placeholder(in context:Context)->ShelfEntry {ShelfEntry(date:Date(),title:"BookWiz",words:0,today:0,goal:500,books:0,chapters:0,sessionEnd:nil)}
    func getSnapshot(in context:Context,completion:@escaping(ShelfEntry)->Void){completion(read())}
    func getTimeline(in context:Context,completion:@escaping(Timeline<ShelfEntry>)->Void){completion(Timeline(entries:[read()],policy:.after(Date().addingTimeInterval(1800))))}
    private func read()->ShelfEntry {let d=UserDefaults(suiteName:"group.com.muneebwanee.bookwiz")?.dictionary(forKey:"BookWizWidgetData") ?? [:];return ShelfEntry(date:Date(),title:d["title"] as? String ?? "Your writing room",words:d["wordCount"] as? Int ?? 0,today:Calendar.current.isDateInToday(Date(timeIntervalSince1970:(d["snapshotAt"] as? Double ?? 0)/1000)) ? (d["today"] as? Int ?? 0):0,goal:max(1,d["goal"] as? Int ?? 500),books:d["books"] as? Int ?? 0,chapters:d["chapters"] as? Int ?? 0,sessionEnd:(d["sessionEndsAt"] as? Double).flatMap{$0>0 ? Date(timeIntervalSince1970:$0/1000):nil})}
}
struct ShelfFace:View {
    let entry:ShelfEntry;let mode:String
    @Environment(\.colorScheme)private var scheme
    var title:String {switch mode {case "goal":return "Today’s page";case "capture":return "Catch a thought";case "session":return "Writing time";case "library":return "Your bookshelf";default:return entry.title}}
    var icon:String {switch mode {case "goal":return "text.word.spacing";case "capture":return "square.and.pencil";case "session":return "timer";case "library":return "books.vertical";default:return "book.closed"}}
    private var accent:Color {scheme == .dark ? Color(red:0.86,green:0.60,blue:0.49) : Color(red:0.59,green:0.29,blue:0.22)}
    var body:some View {
        VStack(alignment:.leading,spacing:10) {
            HStack {
                Image(systemName:icon).font(.system(size:16,weight:.medium)).foregroundStyle(accent)
                Spacer()
                Text("BookWiz").font(.system(.caption2,design:.serif)).foregroundStyle(.secondary)
            }
            Text(title).font(.system(.headline,design:.serif)).lineLimit(2).privacySensitive()
            Spacer(minLength:0)
            if mode == "goal" {
                HStack(alignment:.firstTextBaseline,spacing:4) {
                    Text(entry.today.formatted()).font(.system(.title,design:.rounded)).monospacedDigit().contentTransition(.numericText())
                    Text("/ \(entry.goal.formatted()) words").font(.caption).foregroundStyle(.secondary)
                }
                ProgressView(value:Double(min(entry.today,entry.goal)),total:Double(entry.goal)).tint(accent)
            } else if mode == "capture" {
                Text("A line. A premise.\nSomething to keep.").font(.system(.subheadline,design:.serif)).foregroundStyle(.secondary)
            } else if mode == "session" {
                if let end=entry.sessionEnd,end>Date() {
                    Text(timerInterval:Date()...end,countsDown:true).font(.system(.title,design:.rounded)).monospacedDigit()
                } else {
                    Text("Make room for 25 minutes.").font(.system(.subheadline,design:.serif)).foregroundStyle(.secondary)
                }
            } else if mode == "library" {
                Text("\(entry.books) books").font(.system(.title2,design:.serif)).contentTransition(.numericText())
                Text("\(entry.chapters) drafted chapters").font(.caption).foregroundStyle(.secondary)
            } else {
                Text(entry.words.formatted()).font(.system(.title,design:.rounded)).monospacedDigit().contentTransition(.numericText())
                Text("words on the page").font(.caption).foregroundStyle(.secondary)
            }
        }
        .containerBackground(for:.widget){scheme == .dark ? Color(red:0.09,green:0.10,blue:0.11) : Color(red:0.98,green:0.97,blue:0.94)}
        .widgetURL(URL(string:"bookwiz://widget/"+mode))
        .accessibilityElement(children:.combine)
    }
}
@MainActor
private func shelfConfiguration(kind: String, mode: String, name: String, detail: String) -> some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: ShelfProvider()) { entry in
        ShelfFace(entry: entry, mode: mode)
    }
    .configurationDisplayName(name)
    .description(detail)
    .supportedFamilies([.systemSmall, .systemMedium])
}

// WidgetKit creates each widget with init(). Keep configuration in the shared
// helper and preserve the kind identifiers used by widgets already on a device.
struct CurrentBookWidget: Widget {
    var body: some WidgetConfiguration {
        shelfConfiguration(kind: "BookWizCurrent", mode: "resume", name: "Current book", detail: "Return to the book on your desk.")
    }
}

struct DailyGoalWidget: Widget {
    var body: some WidgetConfiguration {
        shelfConfiguration(kind: "BookWizGoal", mode: "goal", name: "Today’s page", detail: "Keep your daily word goal in view.")
    }
}

struct QuickCaptureWidget: Widget {
    var body: some WidgetConfiguration {
        shelfConfiguration(kind: "BookWizCapture", mode: "capture", name: "Quick capture", detail: "Open a place for a passing thought.")
    }
}

struct WritingSessionWidget: Widget {
    var body: some WidgetConfiguration {
        shelfConfiguration(kind: "BookWizSession", mode: "session", name: "Writing time", detail: "See your current session or begin another.")
    }
}

struct BookshelfWidget: Widget {
    var body: some WidgetConfiguration {
        shelfConfiguration(kind: "BookWizLibrary", mode: "library", name: "Bookshelf", detail: "Your books and drafted chapters at a glance.")
    }
}

@main
struct BookWizWidgetBundle: WidgetBundle {
    var body: some Widget {
        CurrentBookWidget()
        DailyGoalWidget()
        QuickCaptureWidget()
        WritingSessionWidget()
        BookshelfWidget()
    }
}
