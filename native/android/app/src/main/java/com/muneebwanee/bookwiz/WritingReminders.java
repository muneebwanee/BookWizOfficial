package com.muneebwanee.bookwiz;

import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.*;

/** Device-local reminders and session alerts. No server or manuscript text. BWNCL-1.0. */
public final class WritingReminders extends BroadcastReceiver {
 private static final String CHANNEL="bookwiz-writing",SESSION_CHANNEL="bookwiz-sessions";
 private static final String REMINDER="com.muneebwanee.bookwiz.REMINDER",SESSION="com.muneebwanee.bookwiz.SESSION";
 private static final String[] LINES={"A book begins again whenever you return to the page.","Write the sentence only you would notice.","A small, honest detail can open an entire world.","Leave room for the unexpected sentence.","A quiet paragraph is still a way forward.","Let the first draft ask questions. Revision can answer them.","Give one character something they cannot quite say.","The page does not need perfection. It needs a beginning.","A scene can turn on the smallest gesture.","Keep the image that stays with you.","Today, follow one good question.","Make something worth returning to, one line at a time.","You can begin with the part you understand.","Listen for the rhythm beneath the words."};
 private static SharedPreferences prefs(Context c){return c.getSharedPreferences("bookwiz-reminders",0);}
 private static JSONObject plan(Context c){try{return new JSONObject(prefs(c).getString("plan","{}"));}catch(Exception e){return new JSONObject();}}
 static boolean allowed(Context c){return allowed(c,CHANNEL);}
 private static boolean allowed(Context c,String channel){
  NotificationManager n=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
  if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=PackageManager.PERMISSION_GRANTED)return false;
  NotificationChannel ch=n.getNotificationChannel(channel);return n.areNotificationsEnabled()&&(ch==null||ch.getImportance()!=NotificationManager.IMPORTANCE_NONE);
 }
 private static PendingIntent alarm(Context c,int code,String action,int flags){return PendingIntent.getBroadcast(c,code,new Intent(c,WritingReminders.class).setAction(action),flags|PendingIntent.FLAG_IMMUTABLE);}
 private static void cancelAlarm(Context c,int code,String action){PendingIntent p=alarm(c,code,action,PendingIntent.FLAG_NO_CREATE);if(p!=null){((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(p);p.cancel();}}
 static void cancel(Context c){cancelAlarm(c,910,REMINDER);((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(910);}
 static void apply(Context c,String json)throws JSONException{
  JSONObject data=new JSONObject(json);cancel(c);prefs(c).edit().putString("plan",data.toString()).apply();scheduleNext(c);
 }
 static long scheduleNext(Context c){
  JSONObject p=plan(c);if(!p.optBoolean("enabled")||!allowed(c))return 0;
  try{
   long next=ReminderSchedule.next(p.optString("time","19:00"),p.optString("days","weekdays"),p.optString("quietStart","22:00"),p.optString("quietEnd","08:00"),p.optLong("pausedUntil",0),System.currentTimeMillis(),prefs(c).getString("lastDay",""));
   if(next>0){prefs(c).edit().putLong("nextAt",next).apply();((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,alarm(c,910,REMINDER,PendingIntent.FLAG_UPDATE_CURRENT));}return next;
  }catch(Exception e){return 0;}
 }
 static void session(Context c,JSONObject p){
  cancelAlarm(c,911,SESSION);long end=p.optBoolean("enabled")?p.optLong("endsAt",0):0;String project=p.optString("projectId","");
  if(!project.matches("[A-Za-z0-9_-]{1,100}"))project="";
  if(end>System.currentTimeMillis()+121*60000L)end=0;
  prefs(c).edit().putLong("sessionEnd",end).putString("sessionProject",project).apply();scheduleSession(c);
 }
 private static void scheduleSession(Context c){long end=prefs(c).getLong("sessionEnd",0);if(end>System.currentTimeMillis()&&allowed(c,SESSION_CHANNEL))((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,end,alarm(c,911,SESSION,PendingIntent.FLAG_UPDATE_CURRENT));}
 static void refresh(Context c){cancelAlarm(c,910,REMINDER);scheduleNext(c);cancelAlarm(c,911,SESSION);scheduleSession(c);}
 private static void notify(Context c,String channel,int code,String title,String body,String action,String project){
  NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
  NotificationChannel settings=new NotificationChannel(channel,channel.equals(SESSION_CHANNEL)?"Writing session timer":"Writing reminders",NotificationManager.IMPORTANCE_DEFAULT);settings.setDescription(channel.equals(SESSION_CHANNEL)?"A notification when your chosen writing time ends.":"Your daily writing invitation, at a time you choose.");manager.createNotificationChannel(settings);
  Intent open=new Intent(c,MainActivity.class).setAction("com.muneebwanee.bookwiz.OPEN_"+code).putExtra("bookwiz-widget",action).putExtra("bookwiz-project",project).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
  PendingIntent tap=PendingIntent.getActivity(c,code,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  manager.notify(code,new Notification.Builder(c,channel).setSmallIcon(R.drawable.ic_reminder).setContentTitle(title).setContentText(body).setStyle(new Notification.BigTextStyle().bigText(body)).setContentIntent(tap).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).setShowWhen(true).build());
 }
 static boolean test(Context c){if(!allowed(c))return false;notify(c,CHANNEL,912,"Your writing room is ready","Notifications work. Tap to choose your reminder time.","reminders","");return true;}
 @Override public void onReceive(Context c,Intent intent){
  String action=intent.getAction();long now=System.currentTimeMillis();
  if(SESSION.equals(action)){
   long end=prefs(c).getLong("sessionEnd",0);
   if(end>0&&end<=now&&now-end<3600000&&allowed(c,SESSION_CHANNEL))notify(c,SESSION_CHANNEL,911,"A little time, well spent","Your writing session is complete. Return to the page whenever you’re ready.","session",prefs(c).getString("sessionProject",""));
   if(end<=now)prefs(c).edit().remove("sessionEnd").apply();else scheduleSession(c);BookWidgets.refresh(c);return;
  }
  if(!REMINDER.equals(action)){refresh(c);BookWidgets.refresh(c);return;}
  JSONObject p=plan(c);long expected=prefs(c).getLong("nextAt",0);
  try{if(p.optBoolean("enabled")&&allowed(c)&&expected>0&&now>=expected&&now-expected<3600000&&!ReminderSchedule.day(now).equals(prefs(c).getString("lastDay",""))&&!ReminderSchedule.quiet(now,p.optString("quietStart","22:00"),p.optString("quietEnd","08:00"))){
   int quote=(int)Math.floorMod(java.time.LocalDate.now().toEpochDay(),LINES.length);notify(c,CHANNEL,910,"A little room for your words",LINES[quote]+" Open your writing room when it suits you.","resume","");prefs(c).edit().putString("lastDay",ReminderSchedule.day(now)).apply();
  }}catch(Exception ignored){}scheduleNext(c);
 }
}
