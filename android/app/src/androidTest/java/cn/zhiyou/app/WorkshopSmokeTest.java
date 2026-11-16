package cn.zhiyou.app;

import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.ActivityTestRule;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Runs against an installed APK and the device's real Android WebView. */
@RunWith(AndroidJUnit4.class)
public class WorkshopSmokeTest {
 @Rule public ActivityTestRule<MainActivity> rule=new ActivityTestRule<>(MainActivity.class);
 private String js(String expression) throws Exception {
  CountDownLatch latch=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->rule.getActivity().webForTests().evaluateJavascript(expression,value->{result.set(value);latch.countDown();}));
  assertTrue("WebView evaluation timed out",latch.await(8,TimeUnit.SECONDS));return result.get();
 }
 private void awaitReady() throws Exception {
  long until=System.currentTimeMillis()+30000;
  while(System.currentTimeMillis()<until){if("true".equals(js("typeof window.__zhiyouDiagnostics === 'function'")))return;Thread.sleep(300);}
  fail("Bundled workshop did not initialize in Android WebView");
 }
 @Test public void offlineAssetsNativeExportAndProgressSurviveReload() throws Exception {
  awaitReady();assertEquals("2",js("window.__zhiyouDiagnostics().version"));
  assertEquals("true",js("typeof window.NativeFiles.saveFile === 'function'"));
  assertEquals("true",js("!!document.querySelector('#scene canvas') || !!document.querySelector('.scene-fallback')"));
  js("document.querySelector('nav [data-action=archive]').click()");
  js("document.querySelector('[data-action=read-culture]').click()");
  assertEquals("true",js("JSON.parse(localStorage.getItem('zhiyou-workshop-v2')).read.includes('culture')"));
  js("location.reload()");Thread.sleep(700);awaitReady();
  assertEquals("true",js("JSON.parse(localStorage.getItem('zhiyou-workshop-v2')).read.includes('culture')"));
  AtomicReference<Boolean> fileAccess=new AtomicReference<>();
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->fileAccess.set(rule.getActivity().webForTests().getSettings().getAllowFileAccess()));
  assertFalse("File access must stay disabled",fileAccess.get());
 }
}
