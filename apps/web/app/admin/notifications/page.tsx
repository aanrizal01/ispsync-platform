"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Send,
  MessageSquare,
  Mail,
  SendHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Edit,
  Code2,
  Bot,
  Globe,
  Sparkles,
} from "lucide-react";
import {
  notificationApi,
  NotificationRecord,
  NotificationTemplate,
  NotificationChannel,
  SendNotificationInput,
} from "@/lib/api/notifications";

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<"history" | "templates">("history");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showSendModal, setShowSendModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  // Send Test Notification Form
  const [sendForm, setSendForm] = useState<SendNotificationInput>({
    channel: "TELEGRAM",
    recipient: "",
    subject: "Uji Coba Sistem ISP Billing",
    body: "Halo! Ini adalah pesan pengujian dari platform ISP Billing & Network Access Management.",
  });
  const [sending, setSending] = useState(false);

  // Edit Template Form
  const [templateForm, setTemplateForm] = useState({
    subject: "",
    body: "",
    is_active: true,
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifRes, tmplRes] = await Promise.all([
        notificationApi.list({ limit: 50 }),
        notificationApi.listTemplates(),
      ]);
      setNotifications(notifRes.data || []);
      setTemplates(tmplRes.data || []);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data notifikasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await notificationApi.send(sendForm);
      setShowSendModal(false);
      setSendForm({
        channel: "TELEGRAM",
        recipient: "",
        subject: "Uji Coba Sistem ISP Billing",
        body: "Halo! Ini adalah pesan pengujian dari platform ISP Billing & Network Access Management.",
      });
      fetchData();
      alert("Notifikasi berhasil dikirim!");
    } catch (err: any) {
      alert(err.message || "Gagal mengirim notifikasi");
    } finally {
      setSending(false);
    }
  };

  const openEditTemplate = (tmpl: NotificationTemplate) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      subject: tmpl.subject || "",
      body: tmpl.body,
      is_active: tmpl.is_active,
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;

    setSavingTemplate(true);
    try {
      await notificationApi.updateTemplate(editingTemplate.code, templateForm);
      setEditingTemplate(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const telegramCount = notifications.filter((n) => n.channel === "TELEGRAM").length;
  const whatsappCount = notifications.filter((n) => n.channel === "WHATSAPP").length;
  const sentCount = notifications.filter((n) => n.status === "SENT").length;
  const failedCount = notifications.filter((n) => n.status === "FAILED").length;

  const renderChannelBadge = (ch: NotificationChannel) => {
    switch (ch) {
      case "TELEGRAM":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
            <SendHorizontal className="w-3.5 h-3.5 text-sky-600" />
            Telegram
          </span>
        );
      case "WHATSAPP":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            WhatsApp
          </span>
        );
      case "EMAIL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <Mail className="w-3.5 h-3.5 text-purple-600" />
            Email
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            <Globe className="w-3.5 h-3.5 text-slate-600" />
            Webhook
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Pusat Notifikasi & Bot Pesan
          </h1>
          <p className="text-sm text-slate-500">
            Kirim notifikasi tagihan, konfirmasi pembayaran, dan alert NOC via Telegram Bot, WhatsApp, & Email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Segarkan data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            Kirim Pesan Uji Coba
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Terkirim</p>
            <p className="text-2xl font-bold text-slate-900">{sentCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Telegram Bot</p>
            <p className="text-2xl font-bold text-sky-600">{telegramCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">WhatsApp</p>
            <p className="text-2xl font-bold text-emerald-600">{whatsappCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gagal / Error</p>
            <p className="text-2xl font-bold text-rose-600">{failedCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6">
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Riwayat Pengiriman ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "templates"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Template Pesan Otomatis ({templates.length})
          </button>
        </div>

        {/* Tab 1: History Table */}
        {activeTab === "history" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Saluran</th>
                  <th className="px-6 py-3">Penerima</th>
                  <th className="px-6 py-3">Pesan / Subjek</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Memuat riwayat pengiriman...
                    </td>
                  </tr>
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Belum ada notifikasi yang tercatat.
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">{renderChannelBadge(n.channel)}</td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-slate-800">{n.recipient}</div>
                        {n.customer_name && (
                          <div className="text-xs text-slate-400">{n.customer_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-md">
                        {n.subject && (
                          <div className="font-semibold text-xs text-slate-900 mb-0.5">{n.subject}</div>
                        )}
                        <p className="text-xs text-slate-600 line-clamp-2">{n.body}</p>
                        {n.error_message && (
                          <p className="text-xs text-rose-600 mt-1 font-mono">{n.error_message}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            n.status === "SENT"
                              ? "bg-emerald-100 text-emerald-800"
                              : n.status === "FAILED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {n.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(n.created_at).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Templates List */}
        {activeTab === "templates" && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:border-blue-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                      {t.code}
                    </span>
                    {renderChannelBadge(t.channel)}
                  </div>

                  {t.subject && (
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      Subjek: {t.subject}
                    </div>
                  )}

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed mb-3 max-h-36 overflow-y-auto">
                    {t.body}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {t.variables &&
                      t.variables.map((v) => (
                        <span
                          key={v}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-mono"
                        >
                          {"{{" + v + "}}"}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <button
                    onClick={() => openEditTemplate(t)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Send Test Notification */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Kirim Pesan Uji Coba
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Uji pengiriman pesan instan ke Telegram Bot, WhatsApp Gateway, atau Email.
            </p>

            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Saluran Pengiriman</label>
                <select
                  value={sendForm.channel}
                  onChange={(e) =>
                    setSendForm({
                      ...sendForm,
                      channel: e.target.value as NotificationChannel,
                      recipient: "",
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="TELEGRAM">Telegram Bot (Chat ID / Group ID)</option>
                  <option value="WHATSAPP">WhatsApp (Nomor HP: 628xxx)</option>
                  <option value="EMAIL">Email (Alamat Email)</option>
                  <option value="WEBHOOK">Webhook (URL Endpoint)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {sendForm.channel === "TELEGRAM"
                    ? "Telegram Chat ID / Group ID"
                    : sendForm.channel === "WHATSAPP"
                    ? "Nomor WhatsApp (Awalan 62)"
                    : sendForm.channel === "EMAIL"
                    ? "Alamat Email Penerima"
                    : "URL Webhook"}
                </label>
                <input
                  type="text"
                  placeholder={
                    sendForm.channel === "TELEGRAM"
                      ? "Contoh: 123456789 atau -100123456789"
                      : sendForm.channel === "WHATSAPP"
                      ? "Contoh: 6281234567890"
                      : "user@domain.com"
                  }
                  value={sendForm.recipient}
                  onChange={(e) => setSendForm({ ...sendForm, recipient: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-xs"
                  required
                />
              </div>

              {(sendForm.channel === "EMAIL" || sendForm.channel === "TELEGRAM") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subjek Pesan</label>
                  <input
                    type="text"
                    value={sendForm.subject || ""}
                    onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Pesan</label>
                <textarea
                  rows={4}
                  value={sendForm.body}
                  onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? "Mengirim..." : "Kirim Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Template */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Edit Template Notifikasi</h3>
            <p className="text-xs font-mono text-blue-600 mb-4">{editingTemplate.code}</p>

            <form onSubmit={handleSaveTemplate} className="space-y-3">
              {editingTemplate.channel !== "WHATSAPP" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subjek</label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Konten Pesan</label>
                <textarea
                  rows={6}
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono text-xs"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="tmpl_active"
                  checked={templateForm.is_active}
                  onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="tmpl_active" className="text-xs font-medium text-slate-700">
                  Template Aktif Digunakan Otomatis
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {savingTemplate ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
