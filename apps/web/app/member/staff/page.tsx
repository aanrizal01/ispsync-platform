"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MemberNav from "../_nav";
import { useMember } from "../context";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Search,
  AlertCircle
} from "lucide-react";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

export default function StaffManagementPage() {
  const { member, loading, token } = useMember();
  const router = useRouter();
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState({ id: "", name: "", email: "", password: "", role: "NOC", status: "active" });

  useEffect(() => {
    if (!loading && !member) {
      router.replace("/member/login");
    }
  }, [loading, member, router]);

  useEffect(() => {
    if (token) fetchStaff();
  }, [token]);

  async function fetchStaff() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/member/staff", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStaff(data.staff);
      }
    } catch (err) {
      console.error("Failed to fetch staff");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setModalMode("create");
    setFormData({ id: "", name: "", email: "", password: "", role: "NOC", status: "active" });
    setError("");
    setIsModalOpen(true);
  }

  function openEditModal(s: Staff) {
    setModalMode("edit");
    setFormData({ id: s.id, name: s.name, email: s.email, password: "", role: s.role, status: s.status });
    setError("");
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch("/api/member/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: modalMode, ...formData }),
      });
      const data = await res.json();
      
      if (data.success) {
        setIsModalOpen(false);
        fetchStaff();
      } else {
        setError(data.error || "Gagal menyimpan data staf.");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan jaringan.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus staf ini?")) return;
    
    try {
      const res = await fetch("/api/member/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success) fetchStaff();
      else alert(data.error);
    } catch (err) {
      alert("Gagal menghapus staf.");
    }
  }

  if (loading || !member) return null;

  return (
    <MemberNav>
      <div className="max-w-5xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                TENANT ADMINISTRATION
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-600" />
              <span>Manajemen Staf &amp; Akses (RBAC)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Kelola sub-akun untuk karyawan ISP Anda dengan hak akses spesifik (NOC, Sales, Teknisi).
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Staf Baru</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Cari staf..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total Staf: <strong className="text-slate-900">{staff.length}</strong>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Nama Staf</th>
                  <th className="py-3 px-4">Hak Akses (Role)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Ditambahkan Pada</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Memuat data staf...</td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Belum ada akun staf yang didaftarkan.
                    </td>
                  </tr>
                ) : (
                  staff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{s.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {s.status === "active" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(s.createdAt).toLocaleDateString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Staf">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Hapus Staf">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl border border-slate-800 text-xs flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-100 block mb-1">Keamanan &amp; Hak Akses:</strong>
            Setiap akun staf hanya dapat mengakses modul (Ledger, Nexus, FiberGrid) yang relevan dengan peran mereka. 
            Mereka tidak memiliki akses ke pengaturan billing atau portal langganan ISPSYNC (Halaman ini). 
            Kata sandi staf disimpan menggunakan enkripsi hashing SHA-256 selevel standar perbankan.
          </div>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900">
                {modalMode === "create" ? "Tambah Staf Baru" : "Edit Data Staf"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Budi Santoso"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email</label>
                  <input
                    type="email"
                    required
                    disabled={modalMode === "edit"}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                    placeholder="budi.noc@isp-anda.com"
                  />
                  {modalMode === "edit" && <p className="text-[10px] text-slate-400 mt-1">Email tidak dapat diubah.</p>}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {modalMode === "create" ? "Kata Sandi" : "Kata Sandi Baru (Kosongkan jika tidak diubah)"}
                  </label>
                  <input
                    type="password"
                    required={modalMode === "create"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Hak Akses</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white"
                    >
                      <option value="NOC">NOC Admin</option>
                      <option value="SALES">Kasir &amp; Sales</option>
                      <option value="TEKNISI">Teknisi Lapangan</option>
                      <option value="CS">Customer Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-white"
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Nonaktif</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {modalMode === "create" ? "Simpan Staf" : "Update Staf"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MemberNav>
  );
}
