"use client";

import { useState } from "react";
import { Plus, Search, Filter, LifeBuoy, MoreVertical, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ticketsApi, type Ticket } from "@/lib/api/tickets";



export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "Koneksi Internet",
    priority: "MEDIUM",
    description: "",
  });

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ticketsApi.createTicket({
        ...form,
        status: "OPEN"
      });
      setShowModal(false);
      setForm({ title: "", category: "Koneksi Internet", priority: "MEDIUM", description: "" });
      fetchTickets();
    } catch (err) {
      console.error(err);
      alert("Gagal membuat tiket");
    } finally {
      setSubmitting(false);
    }
  };


  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await ticketsApi.getTickets();
      if (res.data) setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        return null;
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

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-cyan-600" />
            <span>Trouble Ticketing</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola komplain pelanggan, gangguan jaringan, dan penugasan SPK teknisi lapangan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Buat Tiket</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari ID tiket atau nama..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tiket</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Subjek & Kategori</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Penugasan</th>
                <th className="px-5 py-3 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-900 text-xs">{ticket.id}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{ticket.customer_id || "Pelanggan Umum"}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(ticket.priority)}
                      <span className="font-bold text-slate-800 text-xs">{ticket.title}</span>
                    </div>
                    <div className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-2">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{ticket.category}</span>
                      <span>&bull;</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString("id-ID")}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {getStatusBadge(ticket.status)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs font-medium text-slate-600">{ticket.assignee_id ? "Ditugaskan" : "Belum Ditugaskan"}</div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">Menampilkan {tickets.length} tiket aktif</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 border border-slate-200 rounded-md text-[11px] font-bold text-slate-400" disabled>Prev</button>
            <button className="px-2 py-1 border border-slate-200 rounded-md text-[11px] font-bold text-slate-600 bg-white">1</button>
            <button className="px-2 py-1 border border-slate-200 rounded-md text-[11px] font-bold text-slate-400" disabled>Next</button>
          </div>
        </div>
      </div>
    
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-cyan-600" />
                <span>Buat Tiket Baru</span>
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Subjek / Judul Masalah</label>
                <input 
                  type="text" 
                  required
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" 
                  placeholder="Misal: Internet Lambat, Router Mati..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kategori</label>
                <select 
                  value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Koneksi Internet">Koneksi Internet</option>
                  <option value="Gangguan Fisik (Kabel)">Gangguan Fisik (Kabel)</option>
                  <option value="Router / Modem">Router / Modem</option>
                  <option value="Billing / Tagihan">Billing / Tagihan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Prioritas</label>
                <select 
                  value={form.priority}
                  onChange={e => setForm({...form, priority: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="LOW">Rendah (Low)</option>
                  <option value="MEDIUM">Sedang (Medium)</option>
                  <option value="HIGH">Tinggi (High)</option>
                  <option value="CRITICAL">Kritis (Critical)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deskripsi Lengkap</label>
                <textarea 
                  required
                  rows={4}
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" 
                  placeholder="Jelaskan detail permasalahan yang dialami..."
                />
              </div>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  {submitting ? "Menyimpan..." : "Buat Tiket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

