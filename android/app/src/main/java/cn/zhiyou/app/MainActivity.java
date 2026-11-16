package cn.zhiyou.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.*;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import java.io.OutputStream;

/** Bundled HTTPS assets, isolated navigation and user-selected document export. */
public class MainActivity extends Activity {
 private static final int EXPORT_DOCUMENT = 42;
 private static final String APP_HOST = "appassets.androidplatform.net";
 private WebView web;
 private byte[] pendingExport;

 @Override public void onCreate(Bundle savedInstanceState) {
  super.onCreate(savedInstanceState);
  getWindow().setStatusBarColor(Color.rgb(246,242,233));
  getWindow().setNavigationBarColor(Color.rgb(249,247,240));
  web=new WebView(this);
  web.setOnApplyWindowInsetsListener((view,insets)->{
   view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   return insets.consumeSystemWindowInsets();
  });
  setContentView(web);web.requestApplyInsets();
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  final WebViewAssetLoader loader=new WebViewAssetLoader.Builder()
    .addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
  web.setWebViewClient(new WebViewClient(){
   @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
    return loader.shouldInterceptRequest(request.getUrl());
   }
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    Uri uri=request.getUrl();
    if(APP_HOST.equals(uri.getHost())&&"https".equals(uri.getScheme()))return false;
    if("https".equals(uri.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}
    catch(android.content.ActivityNotFoundException ignored){}
    return true;
   }
  });
  web.addJavascriptInterface(new DocumentExporter(),"NativeFiles");
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onConsoleMessage(ConsoleMessage message){android.util.Log.i("ZhiyouWeb",message.message());return true;}
   @Override public boolean onJsConfirm(WebView view,String url,String message,JsResult result){
    new AlertDialog.Builder(MainActivity.this).setMessage(message)
      .setPositiveButton("确定",(d,w)->result.confirm()).setNegativeButton("取消",(d,w)->result.cancel())
      .setOnCancelListener(d->result.cancel()).show();return true;
   }
  });
  web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
 }
 public class DocumentExporter {
  @JavascriptInterface public void saveFile(String name,String mime,String payload){
   if(name==null||mime==null||payload==null||payload.length()>2000000)return;
   if(!"application/json".equals(mime)&&!"image/png".equals(mime))return;
   final byte[] data;
   try{data=Base64.decode(payload,Base64.DEFAULT);}catch(IllegalArgumentException error){return;}
   final String cleanedName=name.replaceAll("[^a-zA-Z0-9._-]","_");
   final String safeName=cleanedName.substring(0,Math.min(cleanedName.length(),80));
   runOnUiThread(()->{
    if(pendingExport!=null){Toast.makeText(MainActivity.this,"请先完成上一次导出",Toast.LENGTH_SHORT).show();return;}
    pendingExport=data;
    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
      .setType(mime).putExtra(Intent.EXTRA_TITLE,safeName);
    try{startActivityForResult(intent,EXPORT_DOCUMENT);}
    catch(android.content.ActivityNotFoundException error){pendingExport=null;Toast.makeText(MainActivity.this,"设备没有可用的文件保存器",Toast.LENGTH_SHORT).show();}
   });
  }
 }
 @Override protected void onActivityResult(int request,int result,Intent data){
  super.onActivityResult(request,result,data);
  if(request!=EXPORT_DOCUMENT)return;
  byte[] bytes=pendingExport;pendingExport=null;
  if(result!=RESULT_OK||data==null||data.getData()==null||bytes==null)return;
  try(OutputStream output=getContentResolver().openOutputStream(data.getData())){
   if(output!=null){output.write(bytes);Toast.makeText(this,"文件已保存",Toast.LENGTH_SHORT).show();}
  }catch(Exception error){Toast.makeText(this,"保存失败，请选择其他位置重试",Toast.LENGTH_LONG).show();}
 }
 @Override public void onBackPressed(){
  web.evaluateJavascript("window.zhiyouBack ? window.zhiyouBack() : false",result->{if(!"true".equals(result))finish();});
 }
 @Override protected void onPause(){web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))",null);web.onPause();web.pauseTimers();super.onPause();}
 @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();}}
 @Override protected void onDestroy(){web.removeJavascriptInterface("NativeFiles");web.destroy();pendingExport=null;super.onDestroy();}
 WebView webForTests(){return web;}
}
