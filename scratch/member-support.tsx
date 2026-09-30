"use client";
import MemberNav from "../_nav";
import { useMember } from "../context";

const faqs = [
  { q: "Bagaimana cara upgrade paket?", a: "Hubungi tim ISPSYNC via WhatsApp dengan menyebutkan ID member dan paket yang diinginkan. Proses upgrade biasanya selesai dalam 1x24 jam kerja." },
  { q: "Apakah data saya aman jika saya tidak bayar?", a: "Data Anda akan tetap tersimpan selama 30 hari setelah masa langganan berakhir. Setelah itu sistem akan dinonaktifkan, namun data tetap disimpan untuk 90 hari berikutnya." },
  { q: "Bagaimana cara mendapatkan invoice resmi?", a: "Request invoice PDF bermaterai bisa dilakukan via WhatsApp atau email support. Invoice akan dikirim dalam 1-2 hari kerja." },
  { q: "Apakah ada biaya setup/onboarding?", a: "Untuk paket Starter dan Professional, biaya onboarding gratis. Untuk paket Enterprise dan Private Telco, ada biaya onboarding yang tercantum di kontrak." },
];

export default function MemberSupport() {
  const { member } = useMember();
  if (!member) return null;
  return (
    <MemberNav>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Support</h1>
        <p className="text-gray-500 text-sm mb-8">Butuh bantuan? Tim kami siap membantu Anda.</p>

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: "💬", title: "WhatsApp", desc: "Respon < 1 jam (jam kerja)", action: "Chat Sekarang", href: `https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20member%20${member.id}%20dari%20${encodeURIComponent(member.company)}%20membutuhkan%20bantuan`, color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
            { icon: "📧", title: "Email Support", desc: "support@ispsync.id", action: "Kirim Email", href: `mailto:support@ispsync.id?subject=Support%20Request%20-%20${member.id}&body=Halo%20Tim%20ISPSYNC,%0A%0AID%20Member:%20${member.id}%0APerusahaan:%20${member.company}%0A%0ADeskripsi%20masalah:%0A`, color: "bg-blue-50 border-blue-100 text-blue-700" },
            { icon: "📞", title: "Telepon", desc: "Senin–Jumat, 09.00–17.00", action: "+62 811-0000-000", href: "tel:+6281100000000", color: "bg-indigo-50 border-indigo-100 text-indigo-700" },
          ].map(c => (
            <a key={c.title} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined}
              className={`${c.color} border rounded-2xl p-5 hover:shadow-md transition-all block`}>
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className="font-bold text-sm mb-1">{c.title}</div>
              <div className="text-xs mb-3">{c.desc}</div>
              <div className="text-xs font-bold underline">{c.action}</div>
            </a>
          ))}
        </div>

        {/* Quick help for member */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-8">
          <h2 className="font-bold text-gray-900 mb-4">Bantuan Cepat</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Reset Password CMS", href: `https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20ingin%20reset%20password%20CMS%20untuk%20member%20${member.id}` },
              { label: "Tambah IP Router", href: `https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20ingin%20menambah%20IP%20router%20untuk%20member%20${member.id}` },
              { label: "Lapor Bug / Error", href: `https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20menemukan%20bug%20di%20platform.%20Member%20ID:%20${member.id}` },
              { label: "Request Fitur Baru", href: `https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20ingin%20request%20fitur%20baru.%20Member%20ID:%20${member.id}` },
              { label: "Perpanjang Langganan", href: `https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20ingin%20perpanjang%20langganan.%20Member%20ID:%20${member.id}` },
              { label: "Migrasi Data", href: `https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20membutuhkan%20bantuan%20migrasi%20data.%20Member%20ID:%20${member.id}` },
            ].map(item => (
              <a key={item.label} href={item.href} target="_blank"
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 text-gray-700 rounded-xl text-sm font-medium transition-all border border-gray-100 hover:border-blue-200">
                <span className="text-gray-400">→</span> {item.label}
              </a>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Pertanyaan Umum</h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="font-semibold text-gray-800 text-sm mb-1">Q: {faq.q}</div>
                <div className="text-gray-500 text-xs leading-relaxed">A: {faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MemberNav>
  );
}
