# A place for your next page

BookWiz widgets keep a useful part of your writing room on the home screen. Touch and hold the home screen, choose **Widgets → BookWiz**, and place the size that suits you.

## Android

| Widget | Default grid | Tap destination |
| :--- | :--- | :--- |
| Current book | 2 × 2 | The saved book and chapter, in the writing editor. |
| Today’s page | 4 × 1 | The daily word goal in Writing settings. |
| Quick capture | 2 × 1 | A private note composer with the keyboard ready. |
| Writing time | 2 × 2 | The active writing session, or session duration and word-goal controls. |
| Bookshelf | 4 × 3 | Each book row continues that book; the background opens the library. |
| Clock & focus | 4 × 2 | The clock and **Alarms** open device alarms; **Capture** opens the note composer; **Focus** opens the writing session. The progress strip opens the daily goal. |
| Writing shortcuts | 4 × 1 | Write, Capture, New book and Publish each open their named flow. |
| Weekly rhythm | 4 × 2 | Seven days of saved word counts and the writing-week view. |

| A little inspiration | 4 × 2 | A daily writing invitation; **Write a little** resumes the saved chapter and **Reminders** opens reminder settings. |

Grid cells vary by launcher. Android 12 and later receive responsive layouts for the launcher’s actual portrait and landscape sizes. Earlier editions use the orientation’s allocated bounds. Widgets adapt to the space actually allocated; book and bookshelf layouts show less detail when compact. Existing widgets retain their component identities. If an older widget keeps a very tall size after updating, resize it or remove and add it again: the launcher owns its existing grid allocation.

The clock follows device time, time format and timezone through Android’s `TextClock`. An active session uses a native countdown and one inexact end alarm. No continuous background polling or exact-alarm permission is required. Android may delay the final visual refresh while the app is idle; opening the session always checks the real deadline.

## iPhone and iPad

Current book, Today’s page, Quick capture, Writing time and Bookshelf support the small and medium WidgetKit families. Their existing kind identifiers are retained. The current-book link carries its saved book and chapter; the other widgets open the corresponding controls.

## Your writing stays private

Widgets receive counts, dates, session deadlines and opaque book/chapter identifiers for shortcuts. Book titles appear only when **Show book titles** is enabled in **Settings → Writing**. Manuscript passages, chapter titles, notes, reference text and credentials are excluded. Each installation keeps its own library.

Progress refreshes after app saves and when the app returns to the foreground. Home-screen refreshes are also subject to the operating system’s scheduling. A removed or archived book opens the library with an explanation, rather than opening a different book under the old tile.

[Native editions](NATIVE_APPS.md) · [Build guide](BUILDING.md)

First-party documentation: [CC BY 4.0](LICENSING.md), by muneebwanee.

## Notifications

In **Settings → Writing → Writing reminders**, choose a time and days, enable reminders and allow notifications when asked. Android keeps the chosen local schedule while the app is closed, across restarts, clock changes and timezone changes. iPhone and iPad refresh their next two weeks when opened. Reminders stay private and respect quiet hours.

On Android, use **Send test notification** to check delivery immediately. If no notification appears, open **Device settings** and enable both BookWiz notifications and the Writing reminders category. Battery settings can delay scheduled delivery. A writing session also offers **Notify me when time is up**, with a separate notification category and a tap back to the session controls. These alerts are optional.
