"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  LifeBuoy, MessageSquare, Send, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck, User, RefreshCw, MessageCircle, ArrowLeft
} from "lucide-react";
import { ticketsApi, type Ticket, type TicketMessage } from "@/lib/api/tickets";
import Link from "next/link";

export default function PublicTicketTrackingPage() {
  const params = useParams();
  const ticketId = (params?.id as string) || "";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [customerName, setCustomerName] = useState("Pelanggan");
  const [customerPhone, setCustomerPhone] = useState("");
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Reply form states
  const [replyText, setReplyText] = useState("");
  const [senderName, setSenderName] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Tenant dynamic resolution
  const [tenantName, setTenantName] = useState("ISPSYNC");
  const [tenantSlug, setTenantSlug] = useState("dev");

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname.toLowerCase();
      const parts = host.split(".");
      let slug = "dev";
      if (parts.length >= 4) {
        slug = parts[1];
      } else if (parts.length === 3 && parts[1] === "ispsync") {
        slug = parts[0];
      }
      setTenantSlug(slug);
      setTenantName(slug.toUpperCase());
    }
  }, []);

  const loadTicketData = async (isManual = false) => {
    if (!ticketId) return;
    if (isManual) setRefreshing(true);
    try {
      const res = await ticketsApi.getPublicTicket(ticketId);
      if (res.data) {
        setTicket(res.data.ticket);
        setCustomerName(res.data.customer_name || "Pelanggan");
        if (!senderName) {
          setSenderName(res.data.customer_name || "Pelanggan");
        }
        setCustomerPhone(res.data.customer_phone || "");
        setMessages(res.data.messages || []);
      }
      setError("");
    } catch (err: any) {
      console.error("Gagal memuat tiket:", err);
      if (!ticket) {
        setError("Tiket tidak ditemukan atau nomor pengaduan salah.");
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTicketData();
    // Auto refresh every 10 seconds to fetch replies
    const interval = setInterval(() => {
      loadTicketData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    // Auto-scroll chat to bottom on new messages
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !replyText.trim()) return;

    setSending(true);
    try {
      const res = await ticketsApi.sendPublicMessage(ticketId, {
        message: replyText.trim(),
        sender_type: "CUSTOMER",
        sender_name: senderName.trim() || customerName || "Pelanggan",
      });

      if (res.data) {
        setMessages(prev => [...prev, res.data]);
        setReplyText("");
      }
    } catch (err) {
      console.error("Gagal mengirim balasan:", err);
      alert("Gagal mengirim pesan balasan. Silakan coba kembali.");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>MENUNGGU PENANGANAN</span>
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>SEDANG DITANGANI TEKNISI</span>
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>SELESAI DIPERBAIKI</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      {/* Ambient Radial Glows (Aurora Effect) */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 left-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-cyan-500/20">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white uppercase">{tenantName}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                  PORTAL PENGADUAN
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Pusat Bantuan &amp; Komunikasi Kendala Pelanggan</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadTicketData(true)}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer"
              title="Perbarui data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-400 font-medium">Memuat informasi tiket dan percakapan...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-red-500/30 text-center space-y-3 max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Tiket Tidak Ditemukan</h3>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : ticket ? (
          <div className="space-y-6">
            {/* Ticket Information Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">{ticket.id}</span>
                    <span className="text-slate-600">&bull;</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {ticket.category || "Koneksi Internet"}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-white mt-1 tracking-tight">
                    {ticket.title}
                  </h1>
                </div>
                <div>
                  {getStatusBadge(ticket.status)}
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pelapor / Pelanggan:</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{customerName}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Waktu Dilaporkan:</span>
                  <span className="font-mono text-slate-300 mt-0.5 block">
                    {new Date(ticket.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tingkat Penanganan:</span>
                  <span className="font-bold text-cyan-400 mt-0.5 block">{ticket.priority}</span>
                </div>
              </div>

              {/* Initial Problem Statement */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Rincian Keluhan:</span>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                  {ticket.description || "Tidak ada catatan keluhan awal."}
                </p>
              </div>
            </div>

            {/* Conversation Thread (Helpdesk Chat) */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm shadow-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Ruang Komunikasi Klien &amp; Tim Bantuan ({messages.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Support</span>
                </span>
              </div>

              {/* Messages Container */}
              <div className="p-4 sm:p-5 space-y-3.5 max-h-[360px] overflow-y-auto bg-slate-950/30">
                {messages.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-700 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">Belum ada percakapan</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Ketik pesan di formulir bawah jika Anda ingin menyampaikan perkembangan kondisi internet, foto perangkat, atau pertanyaan kepada teknisi.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isStaff = m.sender_type === "STAFF";
                    return (
                      <div key={m.id} className={`flex flex-col ${isStaff ? "items-start" : "items-end"}`}>
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          {isStaff ? (
                            <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-cyan-400" />
                              <span>{m.sender_name || "Tim Dukungan Teknis"}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{m.sender_name || "Anda (Pelanggan)"}</span>
                            </span>
                          )}
                          <span className="text-slate-700 text-[10px]">&bull;</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(m.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`p-3.5 rounded-2xl text-xs max-w-[85%] sm:max-w-[75%] leading-relaxed whitespace-pre-wrap shadow-sm ${
                            isStaff
                              ? "bg-slate-800/90 text-slate-100 border border-cyan-500/20 rounded-tl-xs"
                              : "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white rounded-tr-xs"
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Ketik pesan atau balasan untuk teknisi..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? "Mengirim..." : "Kirim Pesan"}</span>
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/90 py-4 px-4 text-center text-[11px] text-slate-500">
        <p>&copy; 2026 {tenantName} Broadband &bull; Layanan Pelanggan &amp; Pengaduan Teknis 24 Jam.</p>
      </footer>
    </div>
  );
}
