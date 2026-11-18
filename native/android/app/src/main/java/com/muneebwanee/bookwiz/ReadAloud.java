package com.muneebwanee.bookwiz;
import android.app.Activity;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.os.Bundle;
import org.json.JSONArray;
import org.json.JSONObject;

final class ReadAloud {
 interface Reply {void send(String id,Object value,String error);}
 private final Activity activity;private final Reply reply;private TextToSpeech engine;private boolean ready=false,failed=false,paused=false;private volatile String activeId;private String text="";private volatile int offset=0,base=0;private Runnable waiting;
 ReadAloud(Activity a,Reply r){activity=a;reply=r;engine=new TextToSpeech(a,status->a.runOnUiThread(()->{ready=status==TextToSpeech.SUCCESS;failed=!ready;if(ready)engine.setOnUtteranceProgressListener(new UtteranceProgressListener(){public void onStart(String id){}public void onDone(String id){a.runOnUiThread(()->finish(id,null));}public void onError(String id){a.runOnUiThread(()->finish(id,"The device voice could not finish. Choose another voice."));}public void onRangeStart(String id,int start,int end,int frame){if(id.equals(activeId))offset=base+start;}});if(waiting!=null){Runnable next=waiting;waiting=null;next.run();}}));}
 private void whenReady(String id,Runnable work){if(ready)work.run();else if(failed)reply.send(id,null,"Install or enable a text-to-speech engine in your device’s speech settings.");else if(waiting==null)waiting=()->whenReady(id,work);else reply.send(id,null,"The speech engine is starting. Try again in a moment.");}
 void voices(String id){whenReady(id,()->{JSONArray list=new JSONArray();try{if(engine.getVoices()!=null)for(Voice v:engine.getVoices()){JSONObject item=new JSONObject();item.put("id",v.getName());item.put("voiceURI",v.getName());item.put("name",v.getName().replace('-',' '));item.put("lang",v.getLocale().toLanguageTag());item.put("localService",!v.isNetworkConnectionRequired());item.put("quality",v.getQuality()>=Voice.QUALITY_HIGH?"Enhanced":"Standard");list.put(item);}reply.send(id,list,null);}catch(Exception e){reply.send(id,null,"The device voice list could not be read.");}});}
 void speak(String id,JSONObject p){whenReady(id,()->{stop();try{text=p.getString("text");if(text.length()>5000)throw new Exception();String chosen=p.optString("voice");Voice found=null;if(engine.getVoices()!=null)for(Voice v:engine.getVoices())if(v.getName().equals(chosen)){found=v;break;}if(found==null){reply.send(id,null,"This voice is no longer installed. Choose another voice.");return;}engine.setVoice(found);engine.setSpeechRate((float)Math.max(.5,Math.min(2,p.optDouble("rate",1))));activeId=id;offset=0;base=0;paused=false;run();}catch(Exception e){reply.send(id,null,"The passage could not be read by this device voice.");}});}
 private void run(){base=offset;if(engine.speak(text.substring(Math.min(offset,text.length())),TextToSpeech.QUEUE_FLUSH,new Bundle(),activeId)==TextToSpeech.ERROR)finish(activeId,"The speech engine could not start.");}
 void pause(){if(activeId!=null&&!paused){paused=true;engine.stop();}}
 void resume(){if(activeId!=null&&paused){paused=false;run();}}
 private void finish(String id,String error){if(id==null||!id.equals(activeId)||paused)return;activeId=null;text="";offset=0;base=0;reply.send(id,true,error);}
 void stop(){String old=activeId;activeId=null;paused=false;text="";offset=0;base=0;if(engine!=null)engine.stop();if(old!=null)reply.send(old,null,"Reading stopped.");}
 void destroy(){stop();if(engine!=null)engine.shutdown();}
}
