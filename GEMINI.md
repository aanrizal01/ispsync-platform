# ISPSYNC Platform — Design System & Engineering Rules
> **Learned Design Preset: Linear Telco Dark & Split Aesthetic (Active)**
> *Replaces legacy Telco preset. Last updated: October 2026.*

---

## 🎨 1. Primary Design System: Linear Telco Dark (Carrier-Grade Aesthetic)

Whenever creating or modifying frontend interfaces across the ISPSYNC platform (both Next.js `apps/web` and Go HTML templates `web/*.html`), **strictly follow this design language**:

### A. Color Palette & Canvas
* **Primary Deep Canvas:** `bg-slate-950` (`#020617`) with `via-slate-900` (`#0f172a`) and `to-cyan-950/40`.
  - Never use pure black `#000000`. Use deep slate/charcoal for visual depth.
* **Ambient Radial Glows (Aurora Effect):**
  - Top-left glow: `<div class="absolute -top-32 -left-32 w-80 h-80 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>`
  - Mid-right glow: `<div class="absolute top-1/2 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>`
  - Bottom-center glow: `<div class="absolute -bottom-32 left-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>`
* **Accent Colors:**
  - **Electric Cyan:** `#06b6d4` (`cyan-500`, `cyan-400`) — Primary tech accent representing fiber optics.
  - **Royal / Indigo Blue:** `#3b82f6` (`blue-600`), `#6366f1` (`indigo-500`) — Enterprise reliability.
  - **Emerald Green:** `#10b981` (`emerald-400`, `emerald-500`) — Security, active status, and online indicators.

### B. Typography & Micro-Elements
* **Headlines:** `font-black` or `font-extrabold` with `tracking-tight`.
* **Gradient Text Highlights:** `text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400`.
* **Micro Badges (Clean Corporate Minimal):**
  ```html
  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
    BADGE TEXT
  </span>
  ```
* **Feature Cards (Dark Glassmorphism):**
  ```html
  <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm flex items-start gap-3.5 shadow-sm">
    <div class="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
      <!-- Icon -->
    </div>
    <div>
      <h4 class="text-xs font-bold text-slate-100">Title</h4>
      <p class="text-[11px] text-slate-400 leading-normal">Description</p>
    </div>
  </div>
  ```

### C. Split-Screen Layout Standard
* **Left Panel (Brand Authority & Prestige):** Dark slate gradient, ambient glows, feature showcase, and clean copyright footer.
* **Right Panel (Action & Utility):** Crisp white or high-contrast slate-50, clean typography, rounded-xl inputs with cyan focus rings, and high-velocity gradient submit buttons (`bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600`).

### D. STRICT Prohibited Elements (Anti-Patterns)
* **NEVER Use Sci-Fi / Gimmicky Capsule Badges:**
  - Strictly forbidden: DO NOT use pill/capsule badges with glowing pulsing animated dots (`animate-pulse`).
  - Use clean, sharp, professional corporate badges (`rounded-md bg-slate-800 text-cyan-400 border border-slate-700`).
* **NEVER Add Floating "Sistem Online" Status Indicators:**
  - DO NOT insert `● Sistem Online` or fake status indicators in footers. Keep footers clean with just dynamic copyright.
  - Footer copyright:
    * For Platform-level views (Root SaaS, Member Portal, Registration, System emails): Always use official platform copyright: `© 2026 ISPSYNC Platform — PT. Inovasi Sistem Pintar. All rights reserved.`.
    * For Tenant-specific views (e.g. `ispmu`, `ispku`, `cmedia`): Always dynamically extract the tenant's registered legal PT entity name. Never hardcode one tenant's legal name into another tenant or into platform views.

---

## 🏢 2. Multi-Tenant Architecture Rules

1. **Zero Hardcoded Brand Names & Credentials:**
   * Never hardcode "ISPSYNC" or "GOGIGA" or specific phone numbers inside tenant-facing views.
   * In Go/HTML: Extract from `window.__ISPSYNC_TENANT__` (with fallback to hostname parsing).
   * In Next.js: Extract from hostname/context and store in `tenantName` / `tenantSlug`.

2. **Next.js Page Title Override:**
   * The root layout `apps/web/app/layout.tsx` specifies `template: "%s | ISPSYNC"`.
   * On tenant routes (e.g. `(auth)`), ALWAYS specify `title: { absolute: "..." }` in layout metadata so the parent template does not append `| ISPSYNC`.
   * Dynamically update `document.title = 'Masuk | ' + tenantUpper + ' Ledger'` upon client mount.

3. **Subdomain Parsing Convention:**
   * 4-segment hostname (e.g. `ledger.ispmu.ispsync.id`): Tenant slug is `parts[1]`.
   * 3-segment hostname (e.g. `ispmu.ispsync.id`): Tenant slug is `parts[0]`.
   * Root / SaaS management (e.g. `ispsync.id`, `member.ispsync.id`): Fallback to platform branding.

4. **Dynamic Favicon Support:**
   * Link to `/web/${tenantSlug}_favicon.svg` when available.

5. **Master Internet Plans & Pricing Synchronization (Ledger to NOC/Nexus):**
   * Master paket internet dan tarif resmi tersimpan di skema Ledger (`public.plans` dan `public.plan_prices`).
   * Modul NOC/Nexus (`ispsync.plans`) bertindak sebagai proyeksi operasional untuk masing-masing tenant (`tenant_id`).
   * Query backend `ListPlans` dan `GetPlanByID` di `internal/repository/postgres.go` wajib mempertahankan mekanisme auto-fallback: jika `ispsync.plans` kosong untuk suatu tenant, backend otomatis menyalin dan meng-upsert paket berstatus `ACTIVE` dari `public.plans` + `public.plan_prices` ke `ispsync.plans` menggunakan ID tenant terkait.
   * Frontend modal (seperti Upgrade Bandwidth) dan form registrasi wajib memuat daftar paket secara dinamis melalui `/api/v1/public/plans` tanpa melakukan hardcode opsi paket di template HTML.

6. **Single Owner Account & Flexible Login (Username or Email):**
   * Setiap tenant hanya boleh memiliki **1 akun Owner tunggal** di tabel `users`. Dilarang menduplikasi row pengguna hanya untuk memfasilitasi login via email.
   * Query autentikasi backend (`GetUserByUsername`, `ResetUserPassword`) wajib mendukung pencocokan ganda: `WHERE tenant_id = $1 AND (LOWER(username) = LOWER($2) OR LOWER(email) = LOWER($2))` dengan prioritas kecocokan username.
   * Onboarding tenant baru (`apps/api`) wajib memastikan hanya satu baris akun owner yang dimasukkan ke skema database.

7. **Zero Hardcoded Branches & Wilayah Operasional Dinamis:**
   * DILARANG meng-hardcode nama cabang spesifik (seperti *"Kantor Cabang Payakumbuh (PYK)"*) di dalam template HTML (`web/*.html`).
   * Selector cabang wajib disusun secara dinamis (`syncTenantBranchOptions`) berbasis:
     - Cabang penugasan staf yang terdaftar (`users.branch_code`).
     - Klaster jaringan ODP milik tenant yang aktif.
     - Default universal: `Semua Wilayah Operasional (ALL)` dan `Kantor Pusat (HQ)`.

8. **Hierarchical Data Isolation & Profil Legalitas (FiberGrid / FTTX):**
   * Isolasi data fisik FiberGrid berakar dari tabel `fttx_olt_devices.tenant_slug`. Node turunan (ODC, ODP, Rute Kabel, ONT) diisolasi secara relasional berbasis ID OLT milik tenant yang bersangkutan.
   * Setiap pendaftaran tenant baru wajib otomatis meng-upsert profil legalitas ke `ispsync_fibergrid.fttx_jartaplok_profile` agar data instansi, website, dan domain kustom langsung tersaji dinamis.

9. **Trouble Ticketing, Chatbot Standards & WhatsApp SPK Dispatch:**
   * Tampilan bubble chat Asisten Virtual / Chatbot wajib menggunakan tone tenang dan profesional (*soft slate light theme*), dilarang menggunakan warna hitam pekat yang kontras tinggi dan dilarang menggunakan emoji berlebih.
   * Format Surat Perintah Kerja (SPK) WhatsApp wajib dinamis memuat nama tenant yang relevan, nomor tiket resmi, data lengkap pelanggan, serta nama dan kontak teknisi yang ditugaskan.
   * Tiket dengan status `CLOSED` atau `RESOLVED` wajib mengunci form chat pelanggan (*read-only*) untuk mencegah percakapan berlanjut di tiket yang sudah diarsipkan.

---

## 🚀 3. Deployment & Build Procedures (VPS)
* **Host:** `103.179.65.73`, User: `anri01`
* **Next.js Web Service:**
  `cd /home/anri01/ispsync && git pull origin staging && docker compose -f deploy/docker-compose.prod.yml build web && docker compose -f deploy/docker-compose.prod.yml up -d web`
* **Go Core Service:**
  `cp -r /home/anri01/ispsync/web/* /home/anri01/ispsync-core/web/ && sudo systemctl restart ispsync-core`
