"use client";
import MemberNav from "../_nav";
import { useMember } from "../context";

export default function MemberProfile() {
  const { member } = useMember();
  if (!member) return null;
  const fields = [
    { label: "Nama PIC", value: member.picName },
    { label: "Email", value: member.email },
    { label: "Nomor Telepon", value: member.phone },
    { label: "Nama Perusahaan", value: member.company },
    { label: "Alamat", value: member.address },
    { label: "NPWP", value: member.npwp },
  ];
  return (
    <MemberNav>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Profil Akun</h1>
        <p className="text-gray-500 text-sm mb-8">Informasi perusahaan dan akun ISPSYNC Anda.</p>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-2xl">
              {member.picName.charAt(0)}
            </div>
            <div>
              <div className="font-black text-gray-900 text-lg">{member.picName}</div>
              <div className="text-gray-500 text-sm">{member.company}</div>
              <div className="text-xs text-blue-600 font-medium mt-1">Member ID: {member.id}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.label}>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{f.label}</div>
                <div className="text-sm text-gray-800 font-medium">{f.value || "-"}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="font-bold text-amber-800 text-sm mb-1">Perlu mengubah data profil?</div>
          <p className="text-xs text-amber-600 mb-3">Untuk mengubah informasi perusahaan, email, atau data lainnya, hubungi tim ISPSYNC via WhatsApp dengan menyertakan dokumen yang diperlukan.</p>
          <a href={`https://wa.me/6281100000000?text=Halo%20ISPSYNC,%20saya%20ingin%20mengubah%20data%20profil%20akun%20member%20${member.id}`} target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-all">
            Hubungi untuk Update Data
          </a>
        </div>
      </div>
    </MemberNav>
  );
}
