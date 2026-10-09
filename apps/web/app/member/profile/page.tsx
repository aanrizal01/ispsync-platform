"use client";

import React, { useState, useEffect } from "react";
import MemberNav from "../_nav";
import { useMember } from "../context";
import {
  User,
  Shield,
  KeyRound,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
} from "lucide-react";

export default function MemberProfilePage() {
  const { member, setMember } = useMember();

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    picName: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    npwp: "",
  });

  // Password Form state
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (member) {
      setProfileForm({
        picName: member.picName || "",
        email: member.email || "",
        phone: member.phone || "",
        company: member.company || "",
        address: member.address || "",
        npwp: member.npwp || "",
      });
    }
  }, [member]);

  if (!member) return null;

  const isSuperadmin =
    member.role === "SUPERADMIN" ||
    member.email === "admin@ispsync.id" ||
    member.id === "mbr_001";

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("member-token") : null;
    if (!token) {
      setProfileMsg({ type: "error", text: "Sesi login tidak valid. Silakan masuk kembali." });
      setProfileLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_profile",
          token,
          picName: profileForm.picName,
          email: profileForm.email,
          phone: profileForm.phone,
          company: profileForm.company,
          address: profileForm.address,
          npwp: profileForm.npwp,
        }),
      });

      const data = await res.json();
      if (data.success && data.member) {
        setMember(data.member);
        setProfileMsg({ type: "success", text: "Data profil berhasil diperbarui!" });
      } else {
        setProfileMsg({ type: "error", text: data.error || "Gagal memperbarui profil." });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Gagal terhubung ke server." });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: "error", text: "Konfirmasi kata sandi baru tidak cocok." });
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Kata sandi baru minimal harus 6 karakter." });
      setPasswordLoading(false);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("member-token") : null;
    if (!token) {
      setPasswordMsg({ type: "error", text: "Sesi login tidak valid. Silakan masuk kembali." });
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          token,
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordMsg({ type: "success", text: "Kata sandi berhasil diubah! Gunakan kata sandi baru untuk login berikutnya." });
        setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMsg({ type: "error", text: data.error || "Gagal mengubah kata sandi." });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Gagal terhubung ke server." });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <MemberNav>
      <div className="max-w-4xl pb-16">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-cyan-400 border border-slate-800">
              {isSuperadmin ? "Platform Console Superadmin" : "Member Tenant Console"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan Akun &amp; Profil</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola identitas pemilik, informasi kontak operasional, serta kredensial kata sandi akun Anda.
          </p>
        </div>

        {/* User Badge Top Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0">
              {member.picName ? member.picName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-900 truncate">{member.picName}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {isSuperadmin ? "ROOT SUPERADMIN" : "TENANT OWNER"}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">{member.email}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{member.company} &bull; ID: {member.id}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Status Akun Aktif</span>
            </span>
          </div>
        </div>

        {/* Tabs Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "profile"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <User className="w-4 h-4 text-cyan-400" />
            <span>Informasi Profil &amp; Kontak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "security"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Keamanan &amp; Kata Sandi</span>
          </button>
        </div>

        {/* Tab 1: Profile Form */}
        {activeTab === "profile" && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">DATA IDENTITAS &amp; OPERASIONAL</h3>
                  <p className="text-xs text-slate-500">Informasi nama penanggung jawab dan perusahaan.</p>
                </div>
              </div>

              {profileMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                    profileMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {profileMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{profileMsg.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nama Penanggung Jawab (PIC)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={profileForm.picName}
                      onChange={(e) => setProfileForm({ ...profileForm, picName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alamat Email Akun
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nama Badan Usaha / Perusahaan
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={profileForm.company}
                      onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Alamat Lengkap Kantor / Domisili
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Nomor Pokok Wajib Pajak (NPWP)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={profileForm.npwp}
                      onChange={(e) => setProfileForm({ ...profileForm, npwp: e.target.value })}
                      placeholder="00.000.000.0-000.000"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-cyan-400" />
                  <span>{profileLoading ? "Menyimpan..." : "Simpan Perubahan Profil"}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Security & Password Form */}
        {activeTab === "security" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">PERBARUI KATA SANDI AKUN</h3>
                  <p className="text-xs text-slate-500">Gunakan kata sandi yang kuat untuk menjaga keamanan akses portal.</p>
                </div>
              </div>

              {passwordMsg && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
                    passwordMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  {passwordMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Kata Sandi Saat Ini
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={passwordForm.oldPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                      placeholder="Masukkan kata sandi lama"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Disarankan memuat kombinasi huruf besar, kecil, angka, dan simbol.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Ulangi Kata Sandi Baru
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Ulangi kata sandi baru"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{passwordLoading ? "Memperbarui..." : "Perbarui Kata Sandi"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </MemberNav>
  );
}
