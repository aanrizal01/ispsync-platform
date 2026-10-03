import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { TenantProfile, AppMode } from "./src/types/tenant";
import { TenantService } from "./src/services/tenant-service";
import { TenantSelectScreen } from "./src/screens/TenantSelectScreen";
import { MainPortalScreen } from "./src/screens/MainPortalScreen";
import { PrinterSettingsModal } from "./src/screens/PrinterSettingsModal";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentTenant, setCurrentTenant] = useState<TenantProfile | null>(null);
  const [appMode, setAppMode] = useState<AppMode>("customer");
  const [printerModalVisible, setPrinterModalVisible] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const tenant = await TenantService.getActiveTenant();
      const mode = await TenantService.getAppMode();
      setCurrentTenant(tenant);
      setAppMode(mode);
    } catch (e) {
      console.warn("App initialization error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = (tenant: TenantProfile, mode: AppMode) => {
    setCurrentTenant(tenant);
    setAppMode(mode);
  };

  const handleChangeTenant = () => {
    setCurrentTenant(null);
  };

  const handleOpenScanner = () => {
    Alert.alert(
      "Pindai QR Router",
      "Kamera pemindai siap memindai QR Code di label modem ONT atau faktur tagihan ISP Anda."
    );
  };

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {currentTenant ? (
        <MainPortalScreen
          tenant={currentTenant}
          mode={appMode}
          onChangeTenant={handleChangeTenant}
          onOpenPrinterSettings={() => setPrinterModalVisible(true)}
        />
      ) : (
        <TenantSelectScreen
          onSelectTenant={handleSelectTenant}
          onOpenScanner={handleOpenScanner}
        />
      )}

      <PrinterSettingsModal
        visible={printerModalVisible}
        onClose={() => setPrinterModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  splash: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
  },
});
