package ca.cinematch.app;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    handleHardwareBack();
                }
            }
        );
    }

    private void handleHardwareBack() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            moveTaskToBack(true);
            return;
        }

        final WebView webView = getBridge().getWebView();
        final boolean canGoBack = webView.canGoBack();
        final String js =
            "(function(canGoBack){try{"
                + "if(typeof window.__cinematchHardwareBack==='function'){"
                + "return window.__cinematchHardwareBack(canGoBack);"
                + "}"
                + "var ev=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true});"
                + "if(!document.dispatchEvent(ev)||ev.defaultPrevented)return 'closed';"
                + "if(canGoBack){history.back();return 'back';}"
                + "return 'leave';"
                + "}catch(e){return 'leave';}})("
                + (canGoBack ? "true" : "false")
                + ")";

        webView.evaluateJavascript(js, value -> runOnUiThread(() -> {
            String decision = parseJsDecision(value);
            if ("closed".equals(decision) || "back".equals(decision)) {
                return;
            }
            if (getBridge() != null
                && getBridge().getWebView() != null
                && getBridge().getWebView().canGoBack()) {
                getBridge().getWebView().goBack();
                return;
            }
            moveTaskToBack(true);
        }));
    }

    private static String parseJsDecision(String value) {
        if (value == null || "null".equals(value)) {
            return "leave";
        }
        if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }
}
