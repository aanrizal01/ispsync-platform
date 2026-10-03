import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { TenantProfile, DEFAULT_TENANTS, AppMode } from "../types/tenant";
import { TenantService } from "../services/tenant-service";

interface Props {
  onSelectTenant: (tenant: TenantProfile, mode: AppMode) => void;
  onOpenScanner: () => void;
}

export const TenantSelectScreen: React.FC<Props> = ({
  onSelectTenant,
  onOpenScanner,
}) => {
  const [selectedSlug, setSelectedSlug] = useState<string>("dev");
  const [appMode, setAppMode] = useState<AppMode>("customer");
  const [customInput, setCustomInput] = useState<string>("");

  const handleApply = async (tenant: TenantProfile) => {
    await TenantService.setActiveTenant(tenant);
    await TenantService.setAppMode(appMode);
    onSelectTenant(tenant, appMode);
  };

  const handleCustomSearch = async () => {
    if (!customInput.trim()) return;
    const found = await TenantService.fetchRemoteProfile(customInput);
    if (found) {
      handleApply(found);
    } else {
      Alert.alert(
        "ISP Tidak Ditemukan",
        `Tidak dapat menemukan ISP dengan kode '${customInput}'. Silakan pilih dari daftar yang tersedia.`
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header with Official ISPSYNC Logo */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image
              source={require("../../assets/logo-full.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ALIANSI MOBILE</Text>
            </View>
          </View>
          <Text style={styles.title}>Pilih Jaringan ISP Anda</Text>
          <Text style={styles.subtitle}>
            Aplikasi satu pintu untuk auto-connect Passpoint WiFi, beli voucher hotspot, cek tagihan, dan loket kasir agen.
          </Text>
        </View>

        {/* Role Toggle */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeBtn, appMode === "customer" && styles.modeBtnActive]}
            onPress={() => setAppMode("customer")}
          >
            <Text
              style={[
                styles.modeBtnText,
                appMode === "customer" && styles.modeBtnTextActive,
              ]}
            >
              Pelanggan &amp; WiFi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, appMode === "agent" && styles.modeBtnActive]}
            onPress={() => setAppMode("agent")}
          >
            <Text
              style={[
                styles.modeBtnText,
                appMode === "agent" && styles.modeBtnTextActive,
              ]}
            >
              Mitra Loket Kasir
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scan QR Button */}
        <TouchableOpacity style={styles.scanBtn} onPress={onOpenScanner}>
          <Text style={styles.scanBtnText}>📷 Pindai QR di Router ONT / Faktur</Text>
        </TouchableOpacity>

        {/* Predefined Tenant List */}
        <Text style={styles.sectionTitle}>PILIH DARI KATALOG MITRA ISP:</Text>
        {DEFAULT_TENANTS.map((tenant) => {
          const isSelected = selectedSlug === tenant.slug;
          return (
            <TouchableOpacity
              key={tenant.slug}
              style={[styles.tenantCard, isSelected && styles.tenantCardSelected]}
              onPress={() => {
                setSelectedSlug(tenant.slug);
                handleApply(tenant);
              }}
            >
              <View style={styles.tenantInfo}>
                <View style={styles.tenantHeader}>
                  <Text style={styles.tenantBrand}>{tenant.brandName}</Text>
                  {tenant.wifiBrandName ? (
                    <View style={styles.subBrandBadge}>
                      <Text style={styles.subBrandText}>{tenant.wifiBrandName}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.tenantCompany}>{tenant.companyName}</Text>
                <Text style={styles.tenantDomain}>Domain: {tenant.wifiDomain}</Text>
              </View>
              <View
                style={[
                  styles.selectRadio,
                  isSelected && styles.selectRadioActive,
                ]}
              >
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Custom Input */}
        <View style={styles.customContainer}>
          <Text style={styles.customLabel}>Punya Kode atau Domain ISP Lain?</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.input}
              placeholder="Contoh: gogiga atau wifi.ispmu.id"
              placeholderTextColor="#64748b"
              value={customInput}
              onChangeText={setCustomInput}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleCustomSearch}>
              <Text style={styles.searchBtnText}>Buka</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  logoImage: {
    width: 140,
    height: 38,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: "#06b6d4",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f8fafc",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 18,
  },
  modeContainer: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: "#06b6d4",
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#94a3b8",
  },
  modeBtnTextActive: {
    color: "#020617",
  },
  scanBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  scanBtnText: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  tenantCard: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "space-between",
  },
  tenantCardSelected: {
    borderColor: "#06b6d4",
    backgroundColor: "rgba(6, 182, 212, 0.08)",
  },
  tenantInfo: {
    flex: 1,
    marginRight: 12,
  },
  tenantHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  tenantBrand: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#f1f5f9",
  },
  subBrandBadge: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subBrandText: {
    color: "#020617",
    fontSize: 9,
    fontWeight: "bold",
  },
  tenantCompany: {
    fontSize: 11,
    color: "#94a3b8",
    marginBottom: 4,
  },
  tenantDomain: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "monospace",
  },
  selectRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#475569",
    alignItems: "center",
    justifyContent: "center",
  },
  selectRadioActive: {
    borderColor: "#06b6d4",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#06b6d4",
  },
  customContainer: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  customLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#cbd5e1",
    marginBottom: 8,
  },
  customInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    color: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 12,
  },
  searchBtn: {
    backgroundColor: "#06b6d4",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
  },
  searchBtnText: {
    color: "#020617",
    fontSize: 12,
    fontWeight: "bold",
  },
});
