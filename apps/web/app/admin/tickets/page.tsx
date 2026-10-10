"use client";

import { useState, useEffect } from "react";
import { 
  Plus, Search, Filter, LifeBuoy, MoreVertical, MessageSquare, 
  Clock, CheckCircle2, AlertCircle, User, Wifi, FileText, ChevronRight, X,
  Send, Share2, Copy, Check, Phone, MessageCircle, RefreshCw
} from "lucide-react";
import { ticketsApi, type Ticket, type TicketMessage } from "@/lib/api/tickets";
import { customerApi, type Customer } from "@/lib/api/customers";
import { subscriptionApi, type Subscription } from "@/lib/api/subscriptions";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSubscriptions, setCustomerSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals & Chat States
  const [showModal, setShowModal] = useState(false);
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<Ticket | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [form, setForm] = useState({
    customer_id: "",
    subscription_id: "",
    title: "",
    category: "Koneksi Internet",
    priority: "MEDIUM",
    description: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const openTicketDetail = async (ticket: Ticket) => {
    setSelectedTicketDetail(ticket);
    setReplyText("");
    await fetchTicketMessages(ticket.id);
  };

  const fetchTicketMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const res = await ticketsApi.getMessages(ticketId);
      if (res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat pesan tiket:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketDetail || !replyText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await ticketsApi.sendMessage(selectedTicketDetail.id, {
        message: replyText.trim(),
        sender_type: "STAFF",
        sender_name: "Tim Helpdesk",
      });
      if (res.data) {
        setMessages(prev => [...prev, res.data]);
        setReplyText("");
      }
    } catch (err) {
      console.error("Gagal mengirim pesan:", err);
      alert("Gagal mengirim pesan. Silakan coba kembali.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicketDetail) return;
    setUpdatingStatus(true);
    try {
      await ticketsApi.updateTicket(selectedTicketDetail.id, { status: newStatus });
      setSelectedTicketDetail(prev => prev ? { ...prev, status: newStatus } : null);
      setTickets(prev => prev.map(t => t.id === selectedTicketDetail.id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error("Gagal mengubah status:", err);
      alert("Gagal mengubah status tiket.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCopyTrackingLink = () => {
    if (!selectedTicketDetail) return;
    const url = `${window.location.origin}/ticket/${selectedTicketDetail.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, customersRes] = await Promise.allSettled([
        ticketsApi.getTickets(),
        customerApi.list({ limit: 500 }),
      ]);

      if (ticketsRes.status === "fulfilled" && ticketsRes.value?.data) {
        setTickets(ticketsRes.value.data);
      }
      if (customersRes.status === "fulfilled" && Array.isArray(customersRes.value)) {
        setCustomers(customersRes.value);
      }
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    setForm(prev => ({ ...prev, customer_id: customerId, subscription_id: "" }));
    if (!customerId) {
      setCustomerSubscriptions([]);
      return;
    }

    setLoadingSubscriptions(true);
    try {
      const res = await subscriptionApi.list({ customer_id: customerId, limit: 50 });
      setCustomerSubscriptions(res.data || []);
    } catch (err) {
      console.error("Gagal memuat langganan pelanggan:", err);
      setCustomerSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalDesc = form.description.trim();
      if (form.subscription_id) {
        const sub = customerSubscriptions.find(s => s.id === form.subscription_id);
        if (sub) {
          finalDesc += `\n\n📌 Layanan/Langganan Terkait: ${sub.plan_name || 'Paket Internet'} (Status: ${sub.status}) [ID: ${sub.id}]`;
        }
      }

      await ticketsApi.createTicket({
        customer_id: form.customer_id || undefined,
        title: form.title,
        category: form.category,
        priority: form.priority,
        description: finalDesc,
        status: "OPEN",
      });

      setShowModal(false);
      setForm({
        customer_id: "",
        subscription_id: "",
        title: "",
        category: "Koneksi Internet",
        priority: "MEDIUM",
        description: "",
      });
      setCustomerSubscriptions([]);
      
      // Refresh tickets
      const res = await ticketsApi.getTickets();
      if (res.data) setTickets(res.data);
    } catch (err) {
      console.error("Gagal membuat tiket:", err);
      alert("Gagal membuat tiket. Silakan coba kembali.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">OPEN</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">IN PROGRESS</span>;
      case "RESOLVED":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">RESOLVED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      case "HIGH":
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case "MEDIUM":
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const cust = customers.find(c => c.id === t.customer_id);
    return (
      t.id.toLowerCase().includes(term) ||
      t.title.toLowerCase().includes(term) ||
      (t.category && t.category.toLowerCase().includes(term)) ||
      (cust && (cust.full_name.toLowerCase().includes(term) || cust.customer_number.toLowerCase().includes(term)))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-cyan-600" />
            <span>Trouble Ticketing &amp; Komplain</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola pengaduan pelanggan, gangguan teknis jaringan, dan penugasan perbaikan lapangan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Tiket Baru</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID tiket, judul, atau nama pelanggan..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Total {filteredTickets.length} Tiket Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tiket &amp; Pelanggan</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Subjek &amp; Kategori</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Penugasan</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    Memuat daftar tiket...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Belum ada tiket komplain</p>
                      <p className="text-[11px] text-slate-400">Gunakan tombol "Buat Tiket Baru" untuk mendaftarkan pengaduan pelanggan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const cust = customers.find(c => c.id === ticket.customer_id);
                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-xs font-mono">{ticket.id.slice(0, 13)}</div>
                        <div className="text-[11px] font-bold text-cyan-700 mt-1 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-cyan-600" />
                          <span>{cust ? `${cust.full_name} (${cust.customer_number})` : (ticket.customer_id ? `ID: ${ticket.customer_id.slice(0, 8)}...` : "Pelanggan Umum")}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(ticket.priority)}
                          <span className="font-bold text-slate-800 text-xs">{ticket.title}</span>
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-2">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">{ticket.category || "Umum"}</span>
                          <span>&bull;</span>
                          <span>{new Date(ticket.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(ticket.status)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-medium text-slate-600">{ticket.assignee_id ? "Teknisi Ditugaskan" : "Belum Ditugaskan"}</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button 
                          onClick={() => openTicketDetail(ticket)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Rincian</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Buat Tiket Baru */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 flex items-center justify-center">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 tracking-tight">Buat Tiket Gangguan / Komplain</h2>
                  <p className="text-[11px] text-slate-400">Pilih pelanggan dan rincian gangguan yang dilaporkan.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* 1. Pilih Pelanggan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Tunjuk Pelanggan Terdaftar
                </label>
                <select 
                  value={form.customer_id}
                  onChange={e => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Pelanggan Umum / Calon Pelanggan (Tanpa Akun) --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.customer_number} — {c.full_name} ({c.phone || "No Phone"})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Pilih pelanggan untuk mengaitkan tiket ini dengan riwayat akun &amp; layanan mereka.
                </p>
              </div>

              {/* 2. Pilih Layanan / Langganan (Jika pelanggan dipilih) */}
              {form.customer_id && (
                <div className="p-3.5 bg-cyan-50/50 border border-cyan-100 rounded-xl space-y-1.5">
                  <label className="block text-xs font-bold text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-cyan-600" />
                    <span>2. Layanan / Langganan Terkait (Opsional)</span>
                  </label>
                  {loadingSubscriptions ? (
                    <div className="text-xs text-slate-400 py-1">Memeriksa paket aktif pelanggan...</div>
                  ) : customerSubscriptions.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic">Pelanggan ini belum memiliki paket langganan aktif.</div>
                  ) : (
                    <select 
                      value={form.subscription_id}
                      onChange={e => setForm({ ...form, subscription_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">-- Pilih Layanan yang Bermasalah --</option>
                      {customerSubscriptions.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.plan_name || 'Paket Internet'} ({s.status}) — ID: {s.id.slice(0, 8)}...
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* 3. Subjek / Judul Masalah */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Subjek / Masalah
                </label>
                <input 
                  type="text" 
                  required
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500" 
                  placeholder="Misal: Lampu LOS Merah, Internet Putus-putus, Reset Password..."
                />
              </div>

              {/* 4. Kategori & Prioritas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kategori Gangguan</label>
                  <select 
                    value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="Koneksi Internet">Koneksi Internet (Lambat/LOS)</option>
                    <option value="Gangguan Fisik (Kabel)">Gangguan Fisik (Kabel/ODP)</option>
                    <option value="Router / Modem">Modem / Router / ONT</option>
                    <option value="Billing / Pembayaran">Billing / Tagihan</option>
                    <option value="Registrasi Baru">Pemasangan / Registrasi Baru</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tingkat Prioritas</label>
                  <select 
                    value={form.priority}
                    onChange={e => setForm({...form, priority: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="LOW">Rendah (Low - Informasi)</option>
                    <option value="MEDIUM">Sedang (Medium - Normal)</option>
                    <option value="HIGH">Tinggi (High - Gangguan Sinyal)</option>
                    <option value="CRITICAL">Kritis (Critical - Total Down)</option>
                  </select>
                </div>
              </div>

              {/* 5. Deskripsi Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi Lengkap / Kronologi</label>
                <textarea 
                  required
                  rows={4}
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none leading-relaxed" 
                  placeholder="Tuliskan catatan teknis atau kronologi keluhan pelanggan..."
                />
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Buat Tiket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Rincian Tiket & Thread Percakapan (Two-Way Communication) */}
      {selectedTicketDetail && (() => {
        const cust = customers.find(item => item.id === selectedTicketDetail.customer_id);
        const cleanPhone = cust?.phone?.replace(/\D/g, '') || '';
        const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
        const waText = encodeURIComponent(`Halo Bapak/Ibu ${cust?.full_name || 'Pelanggan'}, kami dari Tim Helpdesk terkait tiket komplain #${selectedTicketDetail.id} (${selectedTicketDetail.title})...\n\nPelacakan tiket dapat diakses melalui: ${typeof window !== 'undefined' ? window.location.origin : ''}/ticket/${selectedTicketDetail.id}`);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 flex items-center justify-center shrink-0">
                    <LifeBuoy className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-cyan-600">{selectedTicketDetail.id}</span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">{selectedTicketDetail.category || "Umum"}</span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight line-clamp-1">{selectedTicketDetail.title}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTicketDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Bar & Action Bar */}
              <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Status:</span>
                  {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((st) => (
                    <button
                      key={st}
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        selectedTicketDetail.status === st
                          ? st === "OPEN" ? "bg-amber-600 text-white shadow-xs"
                          : st === "IN_PROGRESS" ? "bg-blue-600 text-white shadow-xs"
                          : st === "RESOLVED" ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-700 text-white shadow-xs"
                          : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {waNumber && (
                    <a
                      href={`https://wa.me/${waNumber}?text=${waText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                      title="Kirim pesan WhatsApp ke pelanggan"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyTrackingLink}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    title="Salin link pelacakan tiket untuk pelanggan"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedLink ? "Disalin!" : "Link Pelacakan"}</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Content: Details + Chat Thread */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Customer & Ticket Info Box */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-800">
                        {cust ? `${cust.full_name} (${cust.customer_number})` : (selectedTicketDetail.customer_id || "Pelanggan Umum")}
                      </span>
                      {cust?.phone && <span className="font-mono text-slate-500 font-medium">({cust.phone})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Dibuat:</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        {new Date(selectedTicketDetail.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kronologi / Laporan Awal:</span>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-white p-2.5 rounded-lg border border-slate-100 text-xs">
                      {selectedTicketDetail.description || "Tidak ada deskripsi rinci."}
                    </p>
                  </div>
                </div>

                {/* Conversation Thread Header */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Percakapan &amp; Komunikasi ({messages.length})</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => fetchTicketMessages(selectedTicketDetail.id)} 
                    className="text-[11px] font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingMessages ? 'animate-spin' : ''}`} />
                    <span>Muat Ulang</span>
                  </button>
                </div>

                {/* Message List */}
                <div className="space-y-3 bg-slate-50/60 p-3 sm:p-4 rounded-xl border border-slate-200/80 min-h-[160px] max-h-[300px] overflow-y-auto">
                  {loadingMessages ? (
                    <div className="text-center py-8 text-xs text-slate-400">Memuat riwayat pesan...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      <p className="font-medium">Belum ada percakapan pada tiket ini.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Kirim pesan balasan di bawah untuk berkomunikasi dengan pelanggan.</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isStaff = m.sender_type === "STAFF";
                      const isBot = m.sender_type === "BOT";
                      return (
                        <div key={m.id} className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}>
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isStaff ? "text-cyan-700" : isBot ? "text-indigo-600" : "text-slate-600"}`}>
                              {isStaff ? `👨‍💻 ${m.sender_name || "Staf Helpdesk"}` : isBot ? `🤖 ${m.sender_name || "Asisten Virtual"}` : `👤 ${m.sender_name || "Pelanggan"}`}
                            </span>
                            <span className="text-slate-300 text-[10px]">&bull;</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(m.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed whitespace-pre-wrap shadow-2xs ${
                              isStaff
                                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-xs"
                                : isBot
                                ? "bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-xs shadow-md"
                                : "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                            }`}
                          >
                            {m.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Message Reply Input Box */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  required
                  placeholder="Ketik balasan atau pesan bantuan untuk pelanggan..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium transition-all"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !replyText.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{sendingMessage ? "Mengirim..." : "Kirim"}</span>
                </button>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

