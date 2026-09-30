
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

const exactReplacements = [
    // Header brand
    ['children:"GOGIGA"', 'children:"ISPSYNC"'],
    ['children:"NET"', 'children:"SAAS"'],
    ['PT GOGIGA MEDIA TEKNOLOGI', 'PT ISPSYNC TEKNOLOGI NUSANTARA'],
    ['GOGIGANET', 'ISPSYNC'],
    ['GOGIGACMS', 'ISPSYNC CMS'],
    ['GOGIGA', 'ISPSYNC'],

    // Hero title & descriptions
    ['Satu Panel Terpusat untuk Seluruh Operasional ', 'Kendali Penuh Seluruh '],
    ['Satu Panel Terpusat untuk Seluruh Operasional', 'Kendali Penuh Seluruh'],
    ['ISP & FTTH', 'Tenant ISP & Langganan SaaS'],
    ['Platform modern terintegrasi untuk manajemen siklus pelanggan, otomasi FreeRADIUS AAA, sinkronisasi profil bandwidth MikroTik, proration tagihan, dan isolir otomatis.', 'Platform kendali pusat untuk Pemilik SaaS ISPSYNC. Kelola lisensi, status langganan software, monitoring database, dan orkestrasi seluruh ISP Mitra di Indonesia.'],

    // 3 Feature boxes
    ['Provisioning Kredensial PPPoE & RADIUS', 'Manajemen Tenant & Isolasi Workspace'],
    ['Otomatisasi pembuatan username & password PPPoE, sinkronisasi grup kecepatan, dan kontrol radius seketika.', 'Kelola ISP mitra terdaftar (ISPKU, ISPMU, dll) beserta alokasi resource dan status operasional.'],
    ['Faktur Tagihan Berkala & Pratinjau PDF A4', 'Billing Langganan SaaS & MRR Platform'],
    ['Kalkulasi PPN 11%, penanganan proration dinamis, serta cetak lembar invoice A4 resmi sekali klik.', 'Pantau pendapatan rutin per tenant, status pembayaran sewa software bulanan, dan invoice otomatis.'],
    ['Isolir Otomatis & Real-Time CoA Disconnect', 'Otomasi Subdomain & On-Demand TLS'],
    ['Pemutusan akses pelanggan overdue tanpa jeda dengan pesan pengingat tagihan via sistem.', 'Provisioning subdomain (*.ispsync.id) dan custom domain CNAME instan tanpa restart server.'],

    // Form
    ['Masuk ke Akun', 'Login Pemilik SaaS'],
    ['Masukkan email dan kata sandi akun Anda untuk mengakses panel manajemen ISPSYNC CMS atau portal mitra agen voucher.', 'Masuk dengan akun Super Administrator untuk mengelola ekosistem tenant, memantau masa aktif langganan SaaS, dan orkestrasi platform.'],
    ['Alamat Email', 'Email Superadmin'],
    ['placeholder:"nama@email.com"', 'placeholder:"admin@isp.local"'],
    ['placeholder:"Masukkan kata sandi"', 'placeholder:"Masukkan kata sandi superadmin"'],
    ['Ingat sesi login saya', 'Ingat sesi login Superadmin'],
    ['Masuk ke Dashboard', 'Masuk ke SaaS Controller'],
    ['Pelanggan ingin cek atau bayar tagihan internet?', 'Demo Workspace Tenant ISP:'],
    ['Buka Portal Pembayaran Pelanggan', 'Buka Demo Backoffice ISPKU'],
    ['noc@gogiga.net.id', 'support@ispsync.id'],
    ['admin@gogiga.net.id', 'admin@ispsync.id'],
];

const allFiles = walk('/app/.next');
let modifiedCount = 0;

allFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.rsc') || file.endsWith('.json')) {
        try {
            let content = fs.readFileSync(file, 'utf8');
            let orig = content;
            for (const [from, to] of exactReplacements) {
                if (content.includes(from)) {
                    content = content.split(from).join(to);
                }
            }
            if (content !== orig) {
                fs.writeFileSync(file, content, 'utf8');
                modifiedCount++;
            }
        } catch(e) {}
    }
});

console.log(`Cleaned and updated ${modifiedCount} files in container.`);
