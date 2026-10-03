import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Alert,
} from "react-native";
import { PrinterSettings } from "../types/tenant";
import { PrinterService } from "../services/printer-service";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<Props> = ({ visible, onClose }) => {
  const [settings, setSettings] = useState<PrinterSettings>({
    selectedDeviceId: "",
    selectedDeviceName: "Printer Thermal Default (Bluetooth)",
    paperSize: "58mm",
    autoCut: true,
  });

  useEffect(() => {
    if (visible) {
      PrinterService.getSettings().then(setSettings);
    }
  }, [visible]);

  const handleSave = async (updated: PrinterSettings) => {
    setSettings(updated);
    await PrinterService.saveSettings(updated);
  };

  const handleTestPrint = () => {
    const sampleVoucher = {
      code: "TEST-9988",
      profileName: "VOUCHER 24 JAM",
      priceFormatted: "Rp 5.000",
      validity: "24 Jam",
      brandName: "ISPSYNC NET",
      wifiBrand: "@gowifi",
      csPhone: "+62 811-660-1234",
    };
    PrinterService.generateVoucherEscPos(sampleVoucher, settings.paperSize);
    Alert.alert(
      "Tes Cetak Berhasil",
      `Perintah tes struk (${settings.paperSize}) telah dikirim ke printer.`
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Pengaturan Printer Kasir</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.desc}>
            Printer thermal Bluetooth portabel (ESC/POS) untuk kasir loket mitra agen (Panda, Blueprint, VSC, MiniPOS 5802, dll).
          </Text>

          {/* Paper Size Selector */}
          <Text style={styles.sectionLabel}>Ukuran Lebar Kertas Struk:</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.optionBtn,
                settings.paperSize === "58mm" && styles.optionBtnActive,
              ]}
              onPress={() => handleSave({ ...settings, paperSize: "58mm" })}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.paperSize === "58mm" && styles.optionTextActive,
                ]}
              >
                58 mm (Standar Saku)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionBtn,
                settings.paperSize === "80mm" && styles.optionBtnActive,
              ]}
              onPress={() => handleSave({ ...settings, paperSize: "80mm" })}
            >
              <Text
                style={[
                  styles.optionText,
                  settings.paperSize === "80mm" && styles.optionTextActive,
                ]}
              >
                80 mm (Besar / Kasir)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Test Print Button */}
          <TouchableOpacity style={styles.testBtn} onPress={handleTestPrint}>
            <Text style={styles.testBtnText}>🖨️ Tes Cetak Struk Contoh</Text>
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Dukungan Cross-Platform:</Text>
            <Text style={styles.infoText}>
              • Android: Menggunakan Bluetooth Serial Port Profile (SPP).{"\n"}
              • iOS (iPhone): Menggunakan Bluetooth Low Energy (BLE / GATT) tanpa perlu sertifikasi MFi khusus.
            </Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Selesai</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#f8fafc",
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "bold",
  },
  desc: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 16,
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#cbd5e1",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    alignItems: "center",
  },
  optionBtnActive: {
    borderColor: "#06b6d4",
    backgroundColor: "rgba(6, 182, 212, 0.1)",
  },
  optionText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#94a3b8",
  },
  optionTextActive: {
    color: "#06b6d4",
  },
  testBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  testBtnText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "bold",
  },
  infoBox: {
    backgroundColor: "#020617",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#06b6d4",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 10,
    color: "#64748b",
    lineHeight: 15,
  },
  doneBtn: {
    backgroundColor: "#06b6d4",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#020617",
    fontSize: 13,
    fontWeight: "bold",
  },
});
