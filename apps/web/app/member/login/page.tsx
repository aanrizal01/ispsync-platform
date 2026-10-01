"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMember } from "../context";
import Link from "next/link";

export default function MemberLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useMember();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) router.push("/member/dashboard");
    else setError(result.error || "Login gagal");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <img
              src="/logo-prism.png"
              alt="ISPSYNC"
              className="h-12 w-auto object-contain"
            />
            <div className="text-left">
              <div className="text-2xl font-black text-gray-900 tracking-wider">ISPSYNC</div>
              <div className="text-xs text-gray-500 font-medium">Member Portal</div>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-800">Masuk ke Akun Anda</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola langganan dan layanan ISPSYNC Anda</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@perusahaan.com" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <a href="https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20lupa%20password%20Member%20Portal" target="_blank" className="text-xs text-blue-600 hover:text-blue-700">Lupa password?</a>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-200 disabled:opacity-50">
              {loading ? "Memverifikasi..." : "Masuk ke Portal"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">Belum punya akun?{" "}
              <a href="https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20tertarik%20berlangganan%20dan%20ingin%20membuat%20akun%20member" target="_blank" className="text-blue-600 font-semibold hover:underline">
                Daftar via WhatsApp
              </a>
            </p>
          </div>
        </div>

        {/* Demo note */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
          <strong>Demo:</strong> email: <code>demo@ispclient.id</code> / password: <code>Demo1234!</code>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">← Kembali ke ispsync.id</Link>
        </div>
      </div>
    </div>
  );
}
