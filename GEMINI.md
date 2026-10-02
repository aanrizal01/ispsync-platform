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
* **ALWAYS Use Short Brand Name / Slug (e.g. ISPMU):**
  - Always prefer the short brand acronym or slug uppercase (`ISPMU`, `ISPKU`, `GOGIGA`) for all user-facing hero headlines, greetings, and buttons.
  - Never display full legal PT entities (such as "PT. Mitra Usaha Data") as the primary title or greeting.

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

---

## 🚀 3. Deployment & Build Procedures (VPS)
* **Host:** `103.179.65.73`, User: `anri01`
* **Next.js Web Service:**
  `cd /home/anri01/ispsync && git pull origin staging && docker compose -f deploy/docker-compose.prod.yml build web && docker compose -f deploy/docker-compose.prod.yml up -d web`
* **Go Core Service:**
  `cp -r /home/anri01/ispsync/web/* /home/anri01/ispsync-core/web/ && sudo systemctl restart ispsync-core`
