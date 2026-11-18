package com.muneebwanee.bookwiz;

import java.util.Calendar;

/** Local calendar policy shared by the receiver and JVM tests. BWNCL-1.0. */
public final class ReminderSchedule {
 private ReminderSchedule() {}
 private static int minutes(String time) {
  if(time==null||!time.matches("([01][0-9]|2[0-3]):[0-5][0-9]"))throw new IllegalArgumentException("Choose a valid time.");
  return Integer.parseInt(time.substring(0,2))*60+Integer.parseInt(time.substring(3));
 }
 public static String day(long at){Calendar c=Calendar.getInstance();c.setTimeInMillis(at);return c.get(Calendar.YEAR)+"-"+c.get(Calendar.DAY_OF_YEAR);}
 public static boolean quiet(long at,String from,String until){Calendar c=Calendar.getInstance();c.setTimeInMillis(at);int t=c.get(Calendar.HOUR_OF_DAY)*60+c.get(Calendar.MINUTE),a=minutes(from),b=minutes(until);return a!=b&&(a<b?t>=a&&t<b:t>=a||t<b);}
 public static long next(String time,String days,String from,String until,long pausedUntil,long now,String lastDay){
  int minute=minutes(time);if(!days.equals("daily")&&!days.equals("weekdays")&&!days.equals("weekends"))throw new IllegalArgumentException("Choose valid reminder days.");
  Calendar date=Calendar.getInstance();date.setTimeInMillis(Math.max(now,pausedUntil));
  for(int i=0;i<15;i++){
   Calendar candidate=(Calendar)date.clone();candidate.set(Calendar.HOUR_OF_DAY,minute/60);candidate.set(Calendar.MINUTE,minute%60);candidate.set(Calendar.SECOND,0);candidate.set(Calendar.MILLISECOND,0);
   long at=candidate.getTimeInMillis();int weekday=candidate.get(Calendar.DAY_OF_WEEK);boolean weekend=weekday==Calendar.SATURDAY||weekday==Calendar.SUNDAY;
   if(at>now&&at>=pausedUntil&&!day(at).equals(lastDay)&&!quiet(at,from,until)&&(days.equals("daily")||days.equals("weekends")==weekend))return at;
   date.add(Calendar.DATE,1);
  }
  return 0;
 }
}
