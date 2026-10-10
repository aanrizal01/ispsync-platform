"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  LifeBuoy, MessageSquare, Send, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck, User, RefreshCw, ChevronLeft, Lock,
  Bot, Zap, CreditCard, RotateCcw, Wrench, Sparkles
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
  const [logoFallback, setLogoFallback] = useState(false);

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
      const upper = slug === "dev" ? "DEV LAB" : slug.toUpperCase();
      setTenantName(upper);

      // Set initial document title
      document.title = ticketId ? `Tiket #${ticketId} | ${upper}` : `Lacak Tiket | ${upper}`;

      // Update favicon dynamically
      const iconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (iconEl) {
        const favUrl = `/web/${slug}_favicon.svg`;
        const testFavicon = new Image();
        testFavicon.src = favUrl;
        testFavicon.onload = () => { iconEl.href = favUrl; };
        testFavicon.onerror = () => { iconEl.href = "/web/ispsync_favicon.svg"; };
      }
    }
  }, [ticketId]);

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

        if (typeof window !== "undefined") {
          const upper = tenantSlug === "dev" ? "DEV LAB" : tenantSlug.toUpperCase();
          document.title = `Tiket #${res.data.ticket.id} (${res.data.ticket.title}) | ${upper}`;
        }
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
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isTicketClosed = ticket?.status ? ["CLOSED", "RESOLVED"].includes(ticket.status.toUpperCase()) : false;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !replyText.trim() || isTicketClosed) return;

    setSending(true);
    try {
      const res = await ticketsApi.sendPublicMessage(ticketId, {
        message: replyText.trim(),
        sender_type: "CUSTOMER",
        sender_name: senderName.trim() || customerName || "Pelanggan",
      });

      if (res.data) {
        if (res.bot_reply) {
          setMessages(prev => [...prev, res.data, res.bot_reply!]);
        } else {
          setMessages(prev => [...prev, res.data]);
        }
        setReplyText("");
        setTimeout(() => {
          loadTicketData(false);
        }, 1200);
      }
    } catch (err) {
      console.error("Gagal mengirim balasan:", err);
      alert("Gagal mengirim pesan balasan. Silakan coba kembali.");
    } finally {
      setSending(false);
    }
  };

  const handleQuickAction = async (actionText: string) => {
    if (!ticketId || isTicketClosed || sending) return;
    setSending(true);
    try {
      const res = await ticketsApi.sendPublicMessage(ticketId, {
        message: actionText,
        sender_type: "CUSTOMER",
        sender_name: senderName.trim() || customerName || "Pelanggan",
      });

      if (res.data) {
        if (res.bot_reply) {
          setMessages(prev => [...prev, res.data, res.bot_reply!]);
        } else {
          setMessages(prev => [...prev, res.data]);
        }
        setTimeout(() => {
          loadTicketData(false);
        }, 1200);
      }
    } catch (err) {
      console.error("Gagal mengirim aksi diagnosa:", err);
    } finally {
      setSending(false);
    }
  };

  const renderMessageText = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>MENUNGGU PENANGANAN</span>
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            <span>SEDANG DITANGANI TEKNISI</span>
          </span>
        );
      case "RESOLVED":
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>SELESAI DIPERBAIKI</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans selection:bg-cyan-600 selection:text-white">
      {/* Top Navbar (Crisp Light Carrier-Grade) */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-xs sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/ticket" 
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer mr-0.5"
              title="Kembali ke Pencarian Tiket"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <img
              src={`/web/${tenantSlug}_logo.svg`}
              alt={tenantName}
              className="h-8 sm:h-9 w-auto max-w-[180px] object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
                setLogoFallback(true);
              }}
            />
            {logoFallback && (
              <div className="flex items-center gap-2.5">
                <img
                  src={`/web/${tenantSlug}_favicon.svg`}
                  alt=""
                  className="w-8 h-8 rounded-xl object-contain shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                />
                <span className="font-black text-sm tracking-tight text-slate-900 uppercase">{tenantName}</span>
              </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-cyan-800 border border-slate-200 shrink-0">
              PORTAL PENGADUAN
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadTicketData(true)}
              disabled={refreshing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Perbarui data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-600" : "text-slate-500"}`} />
              <span className="hidden sm:inline">Perbarui</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Memuat informasi tiket dan percakapan...</p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-white border border-rose-200 text-center space-y-3 max-w-md mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Tiket Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500">{error}</p>
            <div className="pt-2">
              <Link
                href="/ticket"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl inline-block transition-colors"
              >
                Cari Nomor Tiket Lain
              </Link>
            </div>
          </div>
        ) : ticket ? (
          <div className="space-y-6">
            {/* Ticket Information Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                      {ticket.id}
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {ticket.category || "Koneksi Internet"}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-2 tracking-tight">
                    {ticket.title}
                  </h1>
                </div>
                <div>
                  {getStatusBadge(ticket.status)}
                </div>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pelapor / Pelanggan:</span>
                  <span className="font-bold text-slate-900 mt-0.5 block truncate">{customerName}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Waktu Dilaporkan:</span>
                  <span className="font-mono text-slate-700 mt-0.5 block">
                    {new Date(ticket.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tingkat Penanganan:</span>
                  <span className="font-bold text-cyan-700 mt-0.5 block">{ticket.priority}</span>
                </div>
              </div>

              {/* Initial Problem Statement */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Rincian Keluhan:</span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {ticket.description || "Tidak ada catatan keluhan awal."}
                </p>
              </div>
            </div>

            {/* Conversation Thread (Helpdesk Chat) */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Ruang Komunikasi Klien &amp; Tim Bantuan ({messages.length})
                  </h3>
                </div>
                {/* Clean minimal corporate badge - NO flashing green dot */}
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200 shadow-2xs">
                  Helpdesk
                </span>
              </div>

              {/* Messages Container */}
              <div className="p-4 sm:p-5 space-y-3.5 max-h-[380px] overflow-y-auto bg-slate-50/40">
                {messages.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">Belum ada percakapan</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Ketik pesan di formulir bawah jika Anda ingin menyampaikan perkembangan kondisi internet, foto perangkat, atau pertanyaan kepada teknisi.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isStaff = m.sender_type === "STAFF";
                    const isBot = m.sender_type === "BOT";
                    return (
                      <div key={m.id} className={`flex flex-col ${isStaff || isBot ? "items-start" : "items-end"}`}>
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          {isBot ? (
                            <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                              <Bot className="w-3.5 h-3.5 text-cyan-600" />
                              <span>{m.sender_name || "Asisten Virtual"}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 border border-slate-300 ml-0.5">SISTEM</span>
                            </span>
                          ) : isStaff ? (
                            <span className="text-[10px] font-bold text-cyan-700 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
                              <span>{m.sender_name || "Tim Dukungan Teknis"}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{m.sender_name || "Anda (Pelanggan)"}</span>
                            </span>
                          )}
                          <span className="text-slate-300 text-[10px]">&bull;</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(m.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className={`p-3.5 rounded-2xl text-xs max-w-[85%] sm:max-w-[75%] leading-relaxed whitespace-pre-wrap shadow-2xs ${
                            isBot
                              ? "bg-slate-100/90 text-slate-800 border border-slate-200/90 rounded-tl-xs"
                              : isStaff
                              ? "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                              : "bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 text-white rounded-tr-xs"
                          }`}
                        >
                          {renderMessageText(m.message)}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Action Diagnosa Chips */}
              {!isTicketClosed && (
                <div className="px-3 sm:px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <span className="text-[10px] font-bold text-slate-500 shrink-0 flex items-center gap-1 mr-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Diagnosa Cepat:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("Cek Status Koneksi")}
                    disabled={sending}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 text-cyan-800 hover:text-cyan-900 text-[11px] font-bold border border-slate-200 hover:border-cyan-300 transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Zap className="w-3 h-3 text-cyan-600" />
                    <span>Cek Koneksi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("Cek Status Tagihan")}
                    disabled={sending}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 hover:text-emerald-900 text-[11px] font-bold border border-slate-200 hover:border-emerald-300 transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <CreditCard className="w-3 h-3 text-emerald-600" />
                    <span>Cek Tagihan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("Panduan Restart Modem")}
                    disabled={sending}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-amber-800 hover:text-amber-900 text-[11px] font-bold border border-slate-200 hover:border-amber-300 transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-600" />
                    <span>Restart Modem</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("Bantuan Teknisi Lapangan")}
                    disabled={sending}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-800 hover:text-indigo-900 text-[11px] font-bold border border-slate-200 hover:border-indigo-300 transition-colors shrink-0 flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Wrench className="w-3 h-3 text-indigo-600" />
                    <span>Eskalasi Teknisi</span>
                  </button>
                </div>
              )}

              {/* Closed State Banner or Reply Form */}
              {isTicketClosed ? (
                <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Tiket Telah Selesai &amp; Ditutup</h4>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        Percakapan pada tiket ini telah diarsipkan dan dikunci. Jika Anda masih mengalami kendala atau membutuhkan bantuan teknis baru, silakan buat tiket baru.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <Link
                      href="/ticket"
                      className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors shadow-2xs text-center inline-block"
                    >
                      Buka Tiket Baru
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="p-3 sm:p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Ketik pesan atau balasan untuk teknisi..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:bg-white transition-all font-medium"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? "Mengirim..." : "Kirim Pesan"}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-[11px] text-slate-500">
        <p>&copy; 2026 {tenantName} Broadband &bull; Layanan Pelanggan &amp; Pengaduan Teknis 24 Jam.</p>
      </footer>
    </div>
  );
}
