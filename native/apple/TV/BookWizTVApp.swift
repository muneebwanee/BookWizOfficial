import SwiftUI

private enum TVRoom {
    static let ink=Color(red:0.08,green:0.09,blue:0.10)
    static let paper=Color(red:0.97,green:0.95,blue:0.91)
    static let accent=Color(red:0.84,green:0.52,blue:0.41)
    static let muted=Color(red:0.67,green:0.68,blue:0.67)
}

@main struct BookWizTVApp:App {
    @StateObject private var library=TVLibrary()
    var body:some Scene {WindowGroup {TVShelf(library:library)}}
}

struct TVShelf:View {
    @ObservedObject var library:TVLibrary
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var erase=false
    var body:some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:48) {
                    HStack(alignment:.center,spacing:40) {
                        Label("BookWiz",systemImage:"book.closed").font(.system(size:29,weight:.medium,design:.serif))
                        Spacer()
                        Button {library.receiving ? library.stopReceiving():library.startReceiving()} label: {
                            Label(library.receiving ? "Close receiver" : "Receive a book",systemImage:library.receiving ? "xmark" : "square.and.arrow.down")
                        }.tint(TVRoom.accent)
                    }
                    VStack(alignment:.leading,spacing:18) {
                        Text("Your words.\nA little more room.").font(.system(size:66,weight:.regular,design:.serif))
                        Text("A reading room for the books you’re making.").font(.system(size:26)).foregroundStyle(TVRoom.muted)
                    }.padding(.bottom,12)
                    if library.receiving {
                        receiver.transition(.opacity.combined(with:.move(edge:.top)))
                    }
                    if !library.message.isEmpty {
                        Label(library.message,systemImage:"info.circle").font(.system(size:22)).foregroundStyle(TVRoom.muted)
                            .accessibilityAddTraits(.updatesFrequently)
                    }
                    if library.books.isEmpty {emptyLibrary}
                    else {
                        HStack {
                            Text("On your shelf").font(.system(size:28,weight:.medium,design:.serif))
                            Spacer()
                            Text("\(library.books.count) \(library.books.count==1 ? "book" : "books")").font(.system(size:22)).foregroundStyle(TVRoom.muted)
                        }
                        LazyVGrid(columns:[GridItem(.adaptive(minimum:360),spacing:44)],alignment:.leading,spacing:44) {
                            ForEach(library.books) {book in
                                NavigationLink {TVBookView(book:book,library:library)} label: {TVBookJacket(book:book)}
                                    .buttonStyle(.card)
                                    .accessibilityLabel("\(book.title), by \(book.author), \(book.chapters.count) \(book.chapters.count == 1 ? "chapter" : "chapters")")
                            }
                        }.focusSection()
                    }
                    HStack {
                        Label("Kept on this Apple TV",systemImage:"lock").font(.system(size:19)).foregroundStyle(TVRoom.muted)
                        Spacer()
                        if !library.books.isEmpty {Button("Delete TV library",role:.destructive){erase=true}.font(.system(size:19))}
                    }.padding(.top,30)
                }
                .padding(.horizontal,80).padding(.vertical,60)
                .animation(reduceMotion ? nil : .spring(response:0.42,dampingFraction:1),value:library.receiving)
                .animation(reduceMotion ? nil : .spring(response:0.42,dampingFraction:1),value:library.books.count)
            }
            .background(TVRoom.ink.ignoresSafeArea()).foregroundStyle(TVRoom.paper)
            .preferredColorScheme(.dark).tint(TVRoom.accent)
            .confirmationDialog("Delete every book on this Apple TV?",isPresented:$erase) {
                Button("Delete TV library",role:.destructive){library.erase()}
            } message: {Text("Your original book backups and other devices are unchanged.")}
        }
    }
    private var receiver:some View {
        HStack(alignment:.top,spacing:50) {
            VStack(alignment:.leading,spacing:18) {
                Label("Bring a book over",systemImage:"arrow.down.document").font(.system(size:30,weight:.medium,design:.serif))
                Text("Open this address on a device connected to the same network.").font(.system(size:23)).foregroundStyle(.secondary)
                Text(library.transferURL).font(.system(size:27,weight:.medium,design:.monospaced))
                Text("Choose a BookWiz JSON backup and enter the code. The receiver closes after one transfer.").font(.system(size:21)).foregroundStyle(.secondary)
            }.frame(maxWidth:.infinity,alignment:.leading)
            VStack(alignment:.leading,spacing:14) {
                Text("Your transfer code").font(.system(size:20)).foregroundStyle(.secondary)
                Text(library.pairingCode).font(.system(size:58,weight:.medium,design:.monospaced)).monospacedDigit()
                Text("Use a trusted network.\nLocal transfer is not encrypted.").font(.system(size:18)).foregroundStyle(.secondary)
            }
        }
        .padding(38).background(Color.white.opacity(0.065),in:RoundedRectangle(cornerRadius:24))
    }
    private var emptyLibrary:some View {
        HStack(spacing:36) {
            Image(systemName:"books.vertical").font(.system(size:62,weight:.ultraLight)).foregroundStyle(TVRoom.accent)
            VStack(alignment:.leading,spacing:14) {
                Text("The shelf is yours to fill.").font(.system(size:36,design:.serif))
                Text("Select Receive a book to bring a JSON backup from your writing room.\nYour original manuscript stays on its own device.")
                    .font(.system(size:23)).foregroundStyle(TVRoom.muted).lineSpacing(7)
            }
        }.frame(maxWidth:.infinity,alignment:.leading).padding(.vertical,50)
    }
}

private struct TVBookJacket:View {
    let book:TVBook
    var body:some View {
        VStack(alignment:.leading,spacing:0) {
            HStack {
                Image(systemName:"book.closed").font(.system(size:25,weight:.light))
                Spacer()
                Text("BookWiz").font(.system(size:19,design:.serif))
            }.foregroundStyle(Color(red:0.48,green:0.27,blue:0.21))
            Spacer(minLength:35)
            Text(book.title).font(.system(size:38,weight:.regular,design:.serif)).lineLimit(4)
                .foregroundStyle(TVRoom.ink).frame(maxWidth:.infinity,alignment:.leading)
            Text(book.author).font(.system(size:22)).foregroundStyle(TVRoom.ink.opacity(0.68)).padding(.top,16)
            Spacer(minLength:30)
            HStack {
                Text("\(book.chapters.count) \(book.chapters.count == 1 ? "chapter" : "chapters")").font(.system(size:18)).foregroundStyle(TVRoom.ink.opacity(0.68))
                Spacer()
                Image(systemName:"arrow.up.right").font(.system(size:22,weight:.light)).foregroundStyle(TVRoom.ink)
            }
        }
        .padding(34).frame(maxWidth:.infinity,minHeight:380,alignment:.leading)
        .background(TVRoom.paper,in:RoundedRectangle(cornerRadius:16))
    }
}

struct TVBookView:View {
    let book:TVBook
    @ObservedObject var library:TVLibrary
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var index=0
    @State private var storyboard=false
    private var chapter:TVChapter? {book.chapters.indices.contains(index) ? book.chapters[index] : nil}
    var body:some View {
        VStack(spacing:0) {
            HStack(spacing:24) {
                VStack(alignment:.leading,spacing:7) {
                    Text(book.title).font(.system(size:30,design:.serif)).lineLimit(1)
                    Text(book.author).font(.system(size:19)).foregroundStyle(.secondary)
                }
                Spacer()
                Button {library.stopSpeech();withAnimation(reduceMotion ? nil : .spring(response:0.35,dampingFraction:1)){storyboard.toggle()}} label: {
                    Label(storyboard ? "Read manuscript" : "Story outline",systemImage:storyboard ? "book" : "rectangle.grid.2x2")
                }
                Button {if let chapter=chapter{library.read(chapter.text)}} label: {
                    Label(library.speaking ? "Stop reading" : "Read aloud",systemImage:library.speaking ? "stop.circle" : "speaker.wave.2")
                }.disabled(storyboard || chapter?.text.isEmpty != false)
            }.padding(.horizontal,75).padding(.vertical,28)
            Divider()
            if storyboard {outline.transition(.opacity)}
            else if let chapter=chapter {
                ScrollView {
                    VStack(alignment:.leading,spacing:30) {
                        Text("Chapter \(index+1)").font(.system(size:20)).foregroundStyle(.secondary)
                        Text(chapter.title).font(.system(size:48,weight:.regular,design:.serif))
                        Text(chapter.text.isEmpty ? "This chapter is waiting for its first words." : chapter.text)
                            .font(.system(size:30,design:.serif)).lineSpacing(14)
                    }.frame(maxWidth:1120,alignment:.leading).padding(.horizontal,70).padding(.vertical,48)
                }.id(index).transition(.opacity)
                Divider()
                HStack(spacing:36) {
                    Button {move(-1)} label: {Label("Previous",systemImage:"arrow.left")}.disabled(index==0)
                    Spacer()
                    Text("\(index+1) of \(book.chapters.count)").font(.system(size:22)).monospacedDigit().foregroundStyle(.secondary)
                    Spacer()
                    Button {move(1)} label: {Label("Next chapter",systemImage:"arrow.right")}.disabled(index==book.chapters.count-1)
                }.padding(.horizontal,75).padding(.vertical,25)
            } else {
                Spacer();Text("This book has no readable chapters.").font(.title2);Spacer()
            }
        }
        .background(TVRoom.paper.ignoresSafeArea()).foregroundStyle(TVRoom.ink)
        .preferredColorScheme(.light).tint(Color(red:0.57,green:0.29,blue:0.22))
        .onDisappear{library.stopSpeech()}
    }
    private func move(_ delta:Int) {
        library.stopSpeech()
        withAnimation(reduceMotion ? nil : .easeOut(duration:0.25)) {index=max(0,min(book.chapters.count-1,index+delta))}
    }
    private var outline:some View {
        ScrollView {
            LazyVGrid(columns:[GridItem(.adaptive(minimum:400),spacing:32)],alignment:.leading,spacing:32) {
                ForEach(Array(book.chapters.enumerated()),id:\.element.id) {i,chapter in
                    Button {library.stopSpeech();withAnimation(reduceMotion ? nil : .spring(response:0.35,dampingFraction:1)){index=i;storyboard=false}} label: {
                        VStack(alignment:.leading,spacing:18) {
                            Text("Chapter \(i+1)").font(.system(size:20)).foregroundStyle(.secondary)
                            Text(chapter.title).font(.system(size:30,design:.serif))
                            Text(chapter.beat.isEmpty ? "This chapter has no outline note yet." : chapter.beat).font(.system(size:22)).lineSpacing(6).lineLimit(8)
                        }.frame(maxWidth:.infinity,minHeight:260,alignment:.topLeading).padding(30)
                    }.buttonStyle(.card)
                }
            }.padding(65).focusSection()
        }
    }
}
