package com.muneebwanee.bookwiz;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/** First-party widget code is licensed under BWNCL-1.0; see LICENSE. */
public class BookWidgets extends AppWidgetProvider {
 public static class CurrentBook extends BookWidgets {}
 public static class DailyGoal extends BookWidgets {}
 public static class QuickCapture extends BookWidgets {}
 public static class WritingTime extends BookWidgets {}
 public static class Bookshelf extends BookWidgets {}
 public static class Clock extends BookWidgets {}
 public static class Shortcuts extends BookWidgets {}
 public static class Weekly extends BookWidgets {}
 private static final Class<?>[] KINDS={CurrentBook.class,DailyGoal.class,QuickCapture.class,WritingTime.class,Bookshelf.class,Clock.class,Shortcuts.class,Weekly.class};
 private static final int[] ROWS={R.id.widget_book1,R.id.widget_book2,R.id.widget_book3};
 private static final int[] DAYS={R.id.widget_day1,R.id.widget_day2,R.id.widget_day3,R.id.widget_day4,R.id.widget_day5,R.id.widget_day6,R.id.widget_day7};

 private static String id(JSONObject data,String key){String s=data.optString(key,"");return s.matches("[A-Za-z0-9_-]{1,100}")?s:"";}
 private static int count(JSONObject data,String key){return (int)Math.min(1000000000L,Math.max(0,data.optLong(key,0)));}
 private static String title(JSONObject data,String key,String fallback){String value=data.optString(key,fallback).replaceAll("[\\p{Cntrl}]"," ");return value.substring(0,Math.min(120,value.length()));}
 /** Only routes, counts and explicitly opted-in titles enter shared preferences. */
 public static JSONObject safeSnapshot(JSONObject data)throws Exception {
  JSONObject safe=new JSONObject();boolean titles=data.optBoolean("titles",false);safe.put("titles",titles);
  safe.put("snapshotAt",Math.max(0,data.optLong("snapshotAt",0)));safe.put("sessionEndsAt",Math.max(0,data.optLong("sessionEndsAt",0)));
  for(String key:new String[]{"wordCount","today","goal","books","chapters"})safe.put(key,count(data,key));
  for(String key:new String[]{"projectId","chapterId","sessionProjectId"})safe.put(key,id(data,key));
  safe.put("title",titles?title(data,"title","Your writing room"):"Your writing room");
  JSONArray shelf=new JSONArray(),input=data.optJSONArray("booksList");
  if(input!=null)for(int i=0;i<Math.min(3,input.length());i++){JSONObject book=input.optJSONObject(i);if(book==null||id(book,"projectId").isEmpty())continue;JSONObject row=new JSONObject();row.put("projectId",id(book,"projectId"));row.put("chapterId",id(book,"chapterId"));row.put("words",count(book,"words"));row.put("title",titles?title(book,"title","Book "+(i+1)):"Book "+(i+1));shelf.put(row);}
  safe.put("booksList",shelf);
  JSONArray days=new JSONArray(),activity=data.optJSONArray("days");
  if(activity!=null)for(int i=0;i<Math.min(7,activity.length());i++){JSONObject day=activity.optJSONObject(i);if(day==null||!day.optString("date","").matches("[0-9]{4}-[0-9]{2}-[0-9]{2}"))continue;JSONObject row=new JSONObject();row.put("date",day.getString("date"));row.put("words",count(day,"words"));days.put(row);}
  safe.put("days",days);return safe;
 }
 private static JSONObject data(Context c){try{return new JSONObject(c.getSharedPreferences("bookwiz-widgets",0).getString("data","{}"));}catch(Exception e){return new JSONObject();}}
 private static String number(long n){return String.format(Locale.getDefault(),"%,d",n);}
 private static String shortNumber(int n){return n<1000?number(n):n<1000000?String.format(Locale.getDefault(),"%.1fk",n/1000.0):String.format(Locale.getDefault(),"%.1fm",n/1000000.0);}
 private static int today(JSONObject data){Calendar saved=Calendar.getInstance(),now=Calendar.getInstance();saved.setTimeInMillis(data.optLong("snapshotAt",0));return saved.get(Calendar.YEAR)==now.get(Calendar.YEAR)&&saved.get(Calendar.DAY_OF_YEAR)==now.get(Calendar.DAY_OF_YEAR)?count(data,"today"):0;}
 private static void text(RemoteViews view,int key,String value){view.setTextViewText(key,value);}
 private static int dp(Context c,int value){return Math.round(c.getResources().getDisplayMetrics().density*value);}
 private static void size(RemoteViews view,int key,float value){view.setTextViewTextSize(key,TypedValue.COMPLEX_UNIT_SP,value);}
 private static void link(Context c,RemoteViews view,int key,int widget,String action,JSONObject book,String label){
  String session=action.equals("session")?id(book,"sessionProjectId"):"";String project=session.isEmpty()?id(book,"projectId"):session,chapter=session.isEmpty()?id(book,"chapterId"):"";
  Uri uri=new Uri.Builder().scheme("bookwiz").authority("widget").appendPath(action).appendQueryParameter("widget",String.valueOf(widget)).appendQueryParameter("projectId",project).appendQueryParameter("chapterId",chapter).appendQueryParameter("target",String.valueOf(key)).build();
  Intent intent=new Intent(c,MainActivity.class).setData(uri).putExtra("bookwiz-widget",action).putExtra("bookwiz-project",project).putExtra("bookwiz-chapter",chapter).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
  view.setOnClickPendingIntent(key,PendingIntent.getActivity(c,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));view.setContentDescription(key,label);
 }
 @Override public void onReceive(Context c,Intent intent){super.onReceive(c,intent);String a=intent.getAction();if(Intent.ACTION_CONFIGURATION_CHANGED.equals(a)||Intent.ACTION_TIMEZONE_CHANGED.equals(a)||Intent.ACTION_DATE_CHANGED.equals(a)||Intent.ACTION_TIME_CHANGED.equals(a))onUpdate(c,AppWidgetManager.getInstance(c),AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c,getClass())));}
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager manager,int id,Bundle options){onUpdate(c,manager,new int[]{id});}
 @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){JSONObject data=data(c);for(int widget:ids)update(c,manager,widget,data);}
 private void update(Context c,AppWidgetManager manager,int widget,JSONObject d){
  String kind=getClass().getSimpleName();Bundle options=manager.getAppWidgetOptions(widget);int width=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,0),height=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,0);
  boolean wide=width>=260,compact=height>0&&height<190;
  int layout=kind.equals("DailyGoal")?R.layout.widget_goal:kind.equals("QuickCapture")?R.layout.widget_capture:kind.equals("WritingTime")?R.layout.widget_session:kind.equals("Bookshelf")?R.layout.widget_shelf:kind.equals("Clock")?R.layout.widget_clock:kind.equals("Shortcuts")?R.layout.widget_shortcuts:kind.equals("Weekly")?R.layout.widget_week:wide?R.layout.widget_book_wide:R.layout.bookwiz_widget;
  RemoteViews view=new RemoteViews(c.getPackageName(),layout);if(compact)view.setViewPadding(R.id.widget_root,dp(c,12),dp(c,8),dp(c,12),dp(c,8));String action="resume",description="Continue your saved chapter";
  if(kind.equals("DailyGoal")){
   action="goal";int done=today(d),goal=Math.max(1,d.optInt("goal",500));
   text(view,R.id.widget_value,number(done)+" / "+number(goal)+" words");view.setProgressBar(R.id.widget_progress,goal,Math.min(done,goal),false);
   text(view,R.id.widget_detail,(done>=goal?"Your daily page is here.":number(goal-done)+" words to go")+" · Tap to set your goal");
   if(height>0&&height<110){view.setViewVisibility(R.id.widget_detail,View.GONE);size(view,R.id.widget_value,20);view.setViewPadding(R.id.widget_root,dp(c,12),dp(c,6),dp(c,12),dp(c,6));}
   description=number(done)+" of "+number(goal)+" words today. Open daily goal settings";
  }else if(kind.equals("QuickCapture")){
   action="capture";description="Capture an idea. Open a private note, ready to type";
   if(height>0&&height<75)view.setViewVisibility(R.id.widget_detail,View.GONE);
  }else if(kind.equals("WritingTime")){
   action="session";long end=d.optLong("sessionEndsAt",0),remaining=end-System.currentTimeMillis();
   if(remaining>0){view.setViewVisibility(R.id.widget_value,View.GONE);view.setViewVisibility(R.id.widget_timer,View.VISIBLE);view.setBoolean(R.id.widget_timer,"setCountDown",true);view.setChronometer(R.id.widget_timer,SystemClock.elapsedRealtime()+remaining,"%s",true);text(view,R.id.widget_detail,"Remaining in your session");text(view,R.id.widget_action,"Open this session →");description="Open your current writing session";}
   else {text(view,R.id.widget_value,"25 minutes");text(view,R.id.widget_detail,"Choose a time that suits you.");text(view,R.id.widget_action,"Start a session →");description="Choose a writing session duration";}
   // A single inexact alarm retires an expired countdown; no minute polling.
   Intent tick=new Intent(c,getClass()).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,new int[]{widget});
   PendingIntent alarm=PendingIntent.getBroadcast(c,widget,tick,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);AlarmManager alarms=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);alarms.cancel(alarm);if(remaining>0)alarms.set(AlarmManager.RTC,end,alarm);
   if(compact){view.setViewVisibility(R.id.widget_detail,View.GONE);size(view,R.id.widget_title,16);size(view,R.id.widget_value,23);size(view,R.id.widget_timer,26);}
  }else if(kind.equals("Bookshelf")){
   action="library";description="Open your library";text(view,R.id.widget_value,number(count(d,"books"))+" books");
   JSONArray books=d.optJSONArray("booksList");int shown=0;int rows=height>0&&height<145?1:height>0&&height<205?2:3;view.setViewVisibility(R.id.widget_value,View.GONE);text(view,R.id.widget_brand,"BOOKWIZ · "+number(count(d,"books"))+" BOOKS");
   for(int i=0;i<ROWS.length;i++){JSONObject book=books==null?null:books.optJSONObject(i);boolean visible=book!=null&&i<rows;view.setViewVisibility(ROWS[i],visible?View.VISIBLE:View.GONE);if(visible){shown++;String title=title(book,"title","Book "+(i+1));text(view,ROWS[i],title+"\n"+number(count(book,"words"))+" words · Continue →");link(c,view,ROWS[i],widget,"resume",book,"Continue "+title+", saved chapter");}}
   if(shown==0){view.setViewVisibility(ROWS[0],View.VISIBLE);text(view,ROWS[0],"Make room for your first book\nOpen your library →");link(c,view,ROWS[0],widget,"library",new JSONObject(),"Open your library");}
  }else if(kind.equals("Clock")){
   action="clock";description="Device clock. Open alarms";
   link(c,view,R.id.widget_alarm,widget,"clock",new JSONObject(),"Open device alarms");link(c,view,R.id.widget_focus,widget,"session",d,"Open the BookWiz writing timer");
   if(compact){size(view,R.id.widget_clock,height<130?28:40);view.setViewVisibility(R.id.widget_brand,View.GONE);}
  }else if(kind.equals("Shortcuts")){
   action="library";description="BookWiz writing shortcuts";
   link(c,view,R.id.widget_shortcut_write,widget,"resume",d,"Continue your saved book and chapter");link(c,view,R.id.widget_shortcut_capture,widget,"capture",new JSONObject(),"Capture a thought");link(c,view,R.id.widget_shortcut_new,widget,"new-book",new JSONObject(),"Create a new book");link(c,view,R.id.widget_shortcut_publish,widget,"publish",d,"Open cover and publishing tools");
  }else if(kind.equals("Weekly")){
   action="weekly";description="Open your writing week";JSONArray days=d.optJSONArray("days");long total=0;int written=0;Calendar day=Calendar.getInstance();day.add(Calendar.DATE,-6);SimpleDateFormat key=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT),label=new SimpleDateFormat("EEEEE",Locale.getDefault());
   for(int i=0;i<7;i++){int n=0;String date=key.format(day.getTime());if(days!=null)for(int j=0;j<days.length();j++){JSONObject record=days.optJSONObject(j);if(record!=null&&date.equals(record.optString("date")))n=count(record,"words");}total+=n;if(n>0)written++;text(view,DAYS[i],label.format(day.getTime())+"\n"+shortNumber(n));view.setContentDescription(DAYS[i],new SimpleDateFormat("EEEE, d MMMM",Locale.getDefault()).format(day.getTime())+": "+number(n)+" words");day.add(Calendar.DATE,1);}
   text(view,R.id.widget_value,number(total)+" words");text(view,R.id.widget_detail,written+" writing "+(written==1?"day":"days")+" · Last seven days");if(compact)view.setViewVisibility(R.id.widget_action,View.GONE);if(height>0&&height<140)view.setViewVisibility(R.id.widget_brand,View.GONE);
  }else{
   boolean hasBook=!id(d,"projectId").isEmpty();action=hasBook?"resume":"library";String title=title(d,"title","Your writing room");text(view,R.id.widget_title,hasBook?title:"Your next chapter");text(view,R.id.widget_value,number(count(d,"wordCount"))+" words");text(view,R.id.widget_detail,hasBook?"Your saved chapter":"A place for your first book");text(view,R.id.widget_action,hasBook?"Continue writing →":"Choose a book →");description=hasBook?"Continue "+title+", saved chapter":"Open your library and choose a book";
   if(compact&&!wide){view.setViewVisibility(R.id.widget_detail,View.GONE);view.setInt(R.id.widget_title,"setMaxLines",1);size(view,R.id.widget_title,16);size(view,R.id.widget_value,22);}
  }
  link(c,view,R.id.widget_root,widget,action,action.equals("resume")||action.equals("session")?d:new JSONObject(),description);manager.updateAppWidget(widget,view);
 }
 @Override public void onDeleted(Context c,int[] ids){for(int id:ids){Intent tick=new Intent(c,getClass()).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);PendingIntent alarm=PendingIntent.getBroadcast(c,id,tick,PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);if(alarm!=null){((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(alarm);alarm.cancel();}}}
 public static void refresh(Context c){AppWidgetManager manager=AppWidgetManager.getInstance(c);for(Class<?> type:KINDS){Intent intent=new Intent(c,type).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS,manager.getAppWidgetIds(new ComponentName(c,type)));c.sendBroadcast(intent);}}
}
