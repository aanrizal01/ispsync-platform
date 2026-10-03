import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import { TenantProfile, AppMode } from "../types/tenant";
import { TenantService } from "../services/tenant-service";
import { PrinterService } from "../services/printer-service";

interface Props {
  tenant: TenantProfile;
  mode: AppMode;
  onChangeTenant: () => void;
  onOpenPrinterSettings: () => void;
}

export const MainPortalScreen: React.FC<Props> = ({
  tenant,
  mode,
  onChangeTenant,
  onOpenPrinterSettings,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const initialUrl = TenantService.getTargetUrl(tenant, mode);

  // Script injected into WebView to provide native printer & platform bridge
  const injectedBridgeScript = `
    (function() {
      window.ISPSYNC_MOBILE = {
        platform: 'react-native',
        tenant: ${JSON.stringify(tenant.slug)},
        mode: ${JSON.stringify(mode)},
        isAvailable: function() { return true; },
        openPrinterSettings: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'openSettings' }));
        }
      };

      // Backward compatibility with legacy GOGIGA window.AndroidPrinter
      window.AndroidPrinter = {
        isAvailable: function() { return true; },
        openSettings: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'openSettings' }));
        },
        testPrint: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'testPrint' }));
        },
        printVouchers: function(jsonString, paperSize) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            action: 'printVouchers',
            payload: jsonString,
            paperSize: paperSize || '58mm'
          }));
        },
        shareWhatsApp: function(text, phone) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            action: 'shareWhatsApp',
            text: text,
            phone: phone
          }));
        }
      };

      // Dispatch event to inform web application that native bridge is ready
      window.dispatchEvent(new CustomEvent('ispsync:mobile_ready', {
        detail: { tenant: ${JSON.stringify(tenant.slug)}, mode: ${JSON.stringify(mode)} }
      }));
    })();
    true;
  `;

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.action === "openSettings") {
        onOpenPrinterSettings();
      } else if (data.action === "testPrint") {
        Alert.alert("Printer Native", "Perintah tes cetak diterima dari web!");
      } else if (data.action === "printVouchers") {
        Alert.alert(
          "Cetak Voucher Thermal",
          `Mencetak voucher via Bluetooth ESC/POS (${data.paperSize || "58mm"})...`
        );
      } else if (data.action === "shareWhatsApp") {
        const cleanPhone = (data.phone || "").replace(/\D/g, "");
        const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(
          data.text || ""
        )}`;
        Linking.openURL(url).catch(() => {
          Alert.alert("Gagal", "Aplikasi WhatsApp tidak terpasang di perangkat ini.");
        });
      }
    } catch (e) {
      console.warn("Error handling bridge message:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {/* Top Bar Navigation */}
      <View style={styles.topBar}>
        <View style={styles.tenantMeta}>
          <Text style={styles.tenantName} numberOfLines={1}>
            {tenant.brandName}
          </Text>
          <View style={styles.badgeRow}>
            {tenant.wifiBrandName ? (
              <View style={styles.subBrandBadge}>
                <Text style={styles.subBrandText}>{tenant.wifiBrandName}</Text>
              </View>
            ) : null}
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                {mode === "agent" ? "LOKET KASIR" : "PELANGGAN"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.topActions}>
          {mode === "agent" && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onOpenPrinterSettings}
              title="Pengaturan Printer"
            >
              <Text style={styles.iconBtnText}>🖨️</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => webViewRef.current?.reload()}
            title="Muat Ulang"
          >
            <Text style={styles.iconBtnText}>🔄</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchTenantBtn}
            onPress={onChangeTenant}
          >
            <Text style={styles.switchTenantText}>Ganti ISP</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Menghubungkan ke {tenant.brandName}...</Text>
        </View>
      )}

      {/* WebView Container */}
      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        injectedJavaScriptBeforeContentLoaded={injectedBridgeScript}
        onMessage={handleMessage}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        allowsBackForwardNavigationGestures={true}
        style={styles.webView}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  tenantMeta: {
    flex: 1,
    marginRight: 10,
  },
  tenantName: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "900",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 3,
  },
  subBrandBadge: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subBrandText: {
    color: "#020617",
    fontSize: 9,
    fontWeight: "bold",
  },
  modeBadge: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  modeBadgeText: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "bold",
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  iconBtnText: {
    fontSize: 14,
  },
  switchTenantBtn: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchTenantText: {
    color: "#020617",
    fontSize: 11,
    fontWeight: "bold",
  },
  loadingContainer: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 12,
  },
  webView: {
    flex: 1,
    backgroundColor: "#020617",
  },
});
