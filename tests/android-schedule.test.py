"""Exercise the native local-clock scheduler on a JVM, without an Android device. BWNCL-1.0."""
import os,shutil,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
JAVA=r'''
package com.muneebwanee.bookwiz;
import java.util.*;
public class ScheduleCheck {
 static void check(boolean value){if(!value)throw new AssertionError();}
 static long at(int year,int month,int day,int hour,int minute){Calendar c=Calendar.getInstance();c.clear();c.set(year,month-1,day,hour,minute);return c.getTimeInMillis();}
 static long next(String days,long now,long pause,String last){return ReminderSchedule.next("19:00",days,"22:00","08:00",pause,now,last);}
 public static void main(String[] args){
  TimeZone.setDefault(TimeZone.getTimeZone(args[0]));
  long time=at(2026,3,6,12,0);int seen=0;
  for(int i=0;i<65;i++){long scheduled=next("daily",time,0,"");Calendar c=Calendar.getInstance();c.setTimeInMillis(scheduled);check(c.get(Calendar.HOUR_OF_DAY)==19);check(scheduled>time);time=scheduled+60000;seen++;}check(seen==65);
  long friday=at(2026,3,6,20,0),monday=next("weekdays",friday,0,"");Calendar c=Calendar.getInstance();c.setTimeInMillis(monday);check(c.get(Calendar.DAY_OF_WEEK)==Calendar.MONDAY);
  long weekend=next("weekends",friday,0,"");c.setTimeInMillis(weekend);check(c.get(Calendar.DAY_OF_WEEK)==Calendar.SATURDAY);
  long paused=at(2026,4,1,20,0);check(next("daily",friday,paused,"")>paused);
  long today=at(2026,3,6,12,0);check(next("daily",today,0,ReminderSchedule.day(today))>=at(2026,3,7,0,0));
  check(ReminderSchedule.quiet(at(2026,3,6,23,0),"22:00","08:00"));check(!ReminderSchedule.quiet(at(2026,3,6,8,0),"22:00","08:00"));
  check(ReminderSchedule.next("23:00","daily","22:00","08:00",0,today,"")==0);
  boolean rejected=false;try{ReminderSchedule.next("99:00","daily","22:00","08:00",0,today,"");}catch(IllegalArgumentException e){rejected=true;}check(rejected);
 }
}
'''
class Schedules(unittest.TestCase):
 def test_daily_weekday_pause_quiet_hours_and_long_running_schedules_in_four_timezones(self):
  javac=shutil.which('javac')or str(Path(os.environ.get('JAVA_HOME',''))/'bin/javac');java=shutil.which('java')or str(Path(os.environ.get('JAVA_HOME',''))/'bin/java')
  self.assertTrue(Path(javac).is_file(),'A JDK is required for the native schedule check.')
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);source=root/'ScheduleCheck.java';source.write_text(JAVA)
   subprocess.run([javac,'-d',str(root),str(ROOT/'native/android/app/src/main/java/com/muneebwanee/bookwiz/ReminderSchedule.java'),str(source)],check=True,capture_output=True)
   for zone in ['UTC','America/New_York','Asia/Kolkata','Australia/Sydney']:
    with self.subTest(zone=zone):subprocess.run([java,'-cp',str(root),'com.muneebwanee.bookwiz.ScheduleCheck',zone],check=True,capture_output=True)
if __name__=='__main__':unittest.main()
