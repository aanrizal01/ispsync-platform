"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MemberNav from "../_nav";
import { useMember } from "../context";
import { Building2, Check, ArrowRight, Zap, Shield, Crown } from "lucide-react";

const plans = [
  {
    id: "starter",
    name: "Starter ISP",
    price: 1500000,
    capacity: "500 Pelanggan",
    icon: Zap,
    features: [
      "Akses 3 Engine Utama",
      "Shared Cloud Cluster",
      "Kapasitas up to 500 Sub",
      "Email & WhatsApp Alert",
      "Standar Support",
    ],
    color: "blue",
  },
  {
    id: "pro",
    name: "Professional",
    price: 3500000,
    capacity: "2.500 Pelanggan",
    icon: Shield,
    features: [
      "Akses 3 Engine Utama",
      "Semi-Dedicated Cluster",
      "Kapasitas up to 2.500 Sub",
      "Custom Domain Penuh",
      "API Access & Webhooks",
      "Prioritas Support 24/7",
    ],
    color: "indigo",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 8000000,
    capacity: "Unlimited",
    icon: Crown,
    features: [
      "Akses 3 Engine Utama",
      "Dedicated Bare-Metal Node",
      "Kapasitas Pelanggan Unlimited",
      "White-label 100%",
      "Custom SLA & Kontrak",
      "Dedicated Technical Account Manager",
    ],
    color: "emerald",
  },
];

const colorMaps = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", fill: "text-blue-500" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", fill: "text-indigo-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", fill: "text-emerald-500" },
};

export default function UpgradePage() {
  const { member } = useMember();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");

  if (!member) return null;

  async function handleCheckout(planId: string) {
    setError("");
    setLoadingId(planId);
    try {
      const res = await fetch("/api/member/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || "Gagal membuat tagihan.");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoadingId("");
    }
  }

  return (
    <MemberNav>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Upgrade Layanan ISPSYNC</h1>
          <p className="text-sm text-slate-500 mt-3">
            Tingkatkan kapasitas pelanggan dan dapatkan akses ke infrastruktur dedicated untuk skala operasional ISP Anda. Pembayaran aman melalui Payment Gateway.
          </p>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = member.plan === plan.id;
            const cmap = colorMaps[plan.color as keyof typeof colorMaps];
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border flex flex-col bg-white overflow-hidden transition-all duration-300 ${
                  plan.popular ? "border-indigo-500 shadow-xl shadow-indigo-100 scale-105 z-10" : "border-slate-200 shadow-sm hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1.5">
                    Paling Direkomendasikan
                  </div>
                )}

                <div className={`p-8 flex-1 flex flex-col ${plan.popular ? "pt-12" : ""}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${cmap.bg} ${cmap.text}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                      <p className="text-xs text-slate-500">{plan.capacity}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        Rp {plan.price.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Ditagih per bulan</div>
                  </div>

                  <div className="space-y-3 flex-1 mb-8">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${cmap.fill}`} />
                        <span className="text-sm text-slate-700">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isCurrent || loadingId === plan.id}
                    className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      isCurrent
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                        : plan.popular
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                    }`}
                  >
                    {loadingId === plan.id ? (
                      "Memproses..."
                    ) : isCurrent ? (
                      "Paket Saat Ini"
                    ) : (
                      <>
                        <span>Pilih {plan.name}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MemberNav>
  );
}
