
const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(full));
        } else {
            results.push(full);
        }
    });
    return results;
}

const terms = [
    // Brand header
    ['ISPSYNC SAAS', 'ISPSYNC'],
    ['MASTER SAAS CONTROLLER', 'PORTAL MEMBER'],
    ['PT ISPSYNC TEKNOLOGI NUSANTARA', 'PORTAL MEMBER & LAYANAN'],
    ['Pusat Kendali & Manajemen Langganan Tenant ISP', 'Kelola Langganan & Layanan Akun'],

    // Hero title & descriptions
    ['Kendali Penuh Seluruh Tenant ISP & Langganan SaaS', 'Kelola Langganan & Layanan Akun Anda'],
    ['Kendali Penuh Seluruh', 'Kelola Langganan &'],
    ['Tenant ISP & Langganan SaaS', 'Layanan Akun Anda'],
    ['Platform kendali pusat untuk Pemilik SaaS ISPSYNC. Kelola lisensi, status langganan software, monitoring database, dan orkestrasi seluruh ISP Mitra di Indonesia.', 'Akses portal terpusat untuk memantau masa aktif langganan, rincian paket, riwayat tagihan bulanan, dan pengaturan layanan ISPSYNC Anda.'],
    ['Pantau performa bisnis setiap ISP mitra, kontrol kuota & status langganan SaaS, orkestrasi On-Demand TLS SSL domain, serta rekapitulasi pendapatan platform secara terpusat.', 'Akses portal terpusat untuk memantau masa aktif langganan, rincian paket, riwayat tagihan bulanan, dan pengaturan layanan ISPSYNC Anda.'],

    // 3 Feature boxes
    ['Manajemen Tenant & Isolasi Workspace', 'Masa Aktif & Paket Langganan'],
    ['Kelola ISP mitra terdaftar (ISPKU, ISPMU, dll) beserta alokasi resource dan status operasional.', 'Pantau status aktif langganan, masa berlaku paket, dan kemudahan perpanjangan layanan.'],
    ['Billing Langganan SaaS & MRR Platform', 'Riwayat Faktur & Pembayaran'],
    ['Pantau pendapatan rutin per tenant, status pembayaran sewa software bulanan, dan invoice otomatis.', 'Akses arsip invoice tagihan berkala, kwitansi resmi, dan riwayat transaksi akun Anda.'],
    ['Otomasi Subdomain & On-Demand TLS', 'Konfigurasi & Dukungan Layanan'],
    ['Provisioning subdomain (*.ispsync.id) dan custom domain CNAME instan tanpa restart server.', 'Pengaturan kontak penanggung jawab, integrasi layanan, serta jalur bantuan prioritas.'],

    // Right form
    ['Login Pemilik SaaS', 'Login Portal Member'],
    ['Masuk dengan akun Super Administrator untuk mengelola ekosistem tenant, memantau masa aktif langganan SaaS, dan orkestrasi platform.', 'Masuk ke akun Anda untuk mengelola langganan dan layanan aktif.'],
    ['Email Superadmin', 'Email Akun'],
    ['placeholder:"Masukkan kata sandi superadmin"', 'placeholder:"Masukkan kata sandi"'],
    ['Ingat sesi login Superadmin', 'Ingat sesi login saya'],
    ['Masuk ke SaaS Controller', 'Masuk ke Portal Member'],

    // Clean any demo boxes from this login form
    ['Demo Workspace Tenant ISP:', ''],
    ['Buka Demo Backoffice ISPKU', ''],
    ['Buka Demo Backoffice ISPMU', ''],
    ['Mengalami kendala login? Hubungi NOC / Administrator di support@ispsync.id', 'Butuh bantuan langganan atau aktivasi? Hubungi support@ispsync.id'],
];

const allFiles = walk('/app/.next');
let modified = 0;

allFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.rsc')) {
        try {
            let content = fs.readFileSync(file, 'utf8');
            let orig = content;
            for (const [from, to] of terms) {
                if (content.includes(from)) {
                    content = content.split(from).join(to);
                }
            }
            if (content !== orig) {
                fs.writeFileSync(file, content, 'utf8');
                modified++;
            }
        } catch(e) {}
    }
});
console.log(`Updated ${modified} files with clean Portal Member wording.`);
