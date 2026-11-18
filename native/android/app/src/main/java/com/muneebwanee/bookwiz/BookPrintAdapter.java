package com.muneebwanee.bookwiz;

import android.os.*;
import android.print.*;
import android.webkit.WebView;
import org.json.JSONObject;

/** Reflow to the actual paper chosen by Android's print service. BWNCL-1.0. */
final class BookPrintAdapter extends PrintDocumentAdapter {
 private final WebView view;private final PrintDocumentAdapter delegate;private final double margin;private boolean closed=false;
 BookPrintAdapter(WebView view,double margin){this.view=view;this.margin=Double.isFinite(margin)?Math.max(.25,Math.min(1.5,margin)):.7;delegate=view.createPrintDocumentAdapter("BookWiz manuscript");}
 @Override public void onStart(){delegate.onStart();}
 static String pageStyle(double width,double height,double requestedMargin){
  double m=Math.min(requestedMargin,Math.min(width,height)/4),inner=Math.max(1,height-2*m-.08);
  return "@page{size:"+width+"in "+height+"in;margin:"+m+"in}html,body{width:auto!important;max-width:none!important;height:auto!important;margin:0!important;padding:0!important;background:white!important}.book-page{width:auto!important;min-height:"+inner+"in!important;margin:0!important;padding:0!important;box-shadow:none!important}.title-leaf,.half-title,.copyright-leaf{min-height:"+inner+"in!important}.book-page:first-child{break-before:auto}";
 }
 @Override public void onLayout(PrintAttributes oldAttributes,PrintAttributes newAttributes,CancellationSignal signal,LayoutResultCallback callback,Bundle extras){
  if(closed||signal.isCanceled()){callback.onLayoutCancelled();return;}
  PrintAttributes.MediaSize paper=newAttributes.getMediaSize();if(paper==null){callback.onLayoutFailed("Choose a paper size for this PDF.");return;}
  double width=paper.getWidthMils()/1000.0,height=paper.getHeightMils()/1000.0;
  PrintAttributes.Builder settings=new PrintAttributes.Builder().setMediaSize(paper).setMinMargins(PrintAttributes.Margins.NO_MARGINS);if(newAttributes.getResolution()!=null)settings.setResolution(newAttributes.getResolution());if(newAttributes.getColorMode()!=0)settings.setColorMode(newAttributes.getColorMode());if(newAttributes.getDuplexMode()!=0)settings.setDuplexMode(newAttributes.getDuplexMode());final PrintAttributes layout=settings.build();
  String css=pageStyle(width,height,margin),viewport="width="+Math.round(width*96)+",initial-scale=1";
  String script="(function(){var s=document.getElementById('bookwiz-print-paper');if(!s){s=document.createElement('style');s.id='bookwiz-print-paper';document.head.appendChild(s);}s.textContent="+JSONObject.quote(css)+";var m=document.querySelector('meta[name=viewport]');if(m)m.content="+JSONObject.quote(viewport)+";})()";
  view.evaluateJavascript(script,ignored->{if(closed||signal.isCanceled()){callback.onLayoutCancelled();return;}delegate.onLayout(oldAttributes,layout,signal,callback,extras);});
 }
 @Override public void onWrite(PageRange[] pages,ParcelFileDescriptor destination,CancellationSignal signal,WriteResultCallback callback){delegate.onWrite(pages,destination,signal,callback);}
 @Override public void onFinish(){closed=true;delegate.onFinish();}
}
