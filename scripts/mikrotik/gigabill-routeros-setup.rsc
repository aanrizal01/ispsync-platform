# ==============================================================================
# GigaBill ISP Billing - MikroTik RouterOS v7 Production Setup Script
# ==============================================================================
# Deskripsi:
# Script ini mengonfigurasi Router MikroTik sebagai BNG (Broadband Network Gateway)
# terintegrasi dengan GigaBill Core Billing, FreeRADIUS, CoA (Port 3799),
# dan Firewall Isolir Otomatis (Walled Garden).
#
# PANDUAN PENGGUNAAN:
# 1. Sesuaikan variabel di bawah (IP Server GigaBill, Shared Secret, dll).
# 2. Buka Terminal Winbox / SSH MikroTik.
# 3. Copy-paste script ini, atau upload via FTP/Files lalu jalankan:
#    /import file-name=gigabill-routeros-setup.rsc
# ==============================================================================

:log info "Memulai konfigurasi integrasi GigaBill..."

# ------------------------------------------------------------------------------
# 1. VARIABEL KONFIGURASI (SESUAIKAN DENGAN LINGKUNGAN ANDA)
# ------------------------------------------------------------------------------
:local GigaBillServerIP "192.168.1.100"      ;# IP Server GigaBill / FreeRADIUS
:local RadiusSecret     "testing123"        ;# RADIUS Shared Secret (sama dengan di /admin/network)
:local RouterApiUser    "gigabill-api"      ;# Username API MikroTik untuk GigaBill
:local RouterApiPass    "GigaBillSecure123" ;# Password API MikroTik
:local IsolirNetwork    "10.254.254.0/24"   ;# Subnet IP Isolir pelanggan menunggak
:local IsolirGateway    "10.254.254.1"      ;# IP Gateway MikroTik untuk subnet isolir
:local PortalBillingIP  "192.168.1.100"      ;# IP Web Portal Billing (/billing/check)
:local PortalBillingPort "3000"             ;# Port Web Portal Billing

# ------------------------------------------------------------------------------
# 2. KONFIGURASI USER API MIKROTIK (ROUTEROS v7 REST API & API PORT 8728)
# ------------------------------------------------------------------------------
:log info "1/6. Menyiapkan User & Akses API GigaBill..."

# Aktifkan service API standar (port 8728) dan REST API (www-ssl / www)
/ip service set api disabled=no port=8728
/ip service set www disabled=no port=80

# Buat grup khusus API jika belum ada
/user group add name=gigabill-group policy=api,read,write,test,policy,password comment="Grup Khusus GigaBill API"

# Tambah user API
/user add name=$RouterApiUser group=gigabill-group password=$RouterApiPass comment="API Service Account for GigaBill"

# ------------------------------------------------------------------------------
# 3. KONFIGURASI RADIUS CLIENT (FREERADIUS 3.x)
# ------------------------------------------------------------------------------
:log info "2/6. Mengonfigurasi FreeRADIUS Client..."

# Hapus konfigurasi radius lama yang mengarah ke server yang sama jika ada
/radius remove [find comment="GigaBill-Core-RADIUS"]

# Daftarkan server FreeRADIUS GigaBill untuk service ppp, hotspot, login, wireless
/radius add \
    address=$GigaBillServerIP \
    secret=$RadiusSecret \
    service=ppp,hotspot,login \
    authentication-port=1812 \
    accounting-port=1813 \
    timeout=3000ms \
    comment="GigaBill-Core-RADIUS"

# ------------------------------------------------------------------------------
# 4. AKTIFKAN RADIUS INCOMING / CoA (RFC 3576 / RFC 5176 PORT 3799)
# ------------------------------------------------------------------------------
:log info "3/6. Mengaktifkan RADIUS Incoming CoA / PoD Disconnect..."

# CoA menerima perintah Disconnect-Request dan Change-of-Authorization dari GigaBill
/radius incoming set accept=yes port=3799

# ------------------------------------------------------------------------------
# 5. POOL IP ISOLIR & PROFIL PPPoE
# ------------------------------------------------------------------------------
:log info "4/6. Membuat Pool Isolir & Profil PPPoE..."

# Buat IP Pool khusus pelanggan yang jatuh tempo/isolir
/ip pool add name=pool-isolir-gigabill ranges=10.254.254.2-10.254.254.254

# Buat IP Address gateway isolir di MikroTik (opsional pasang di loopback atau interface isolir)
/ip address add address=$IsolirGateway/24 network=10.254.254.0 interface=lo comment="Gateway IP Pelanggan Isolir"

# Profil PPPoE Default dengan integrasi RADIUS
/ppp profile add \
    name="GigaBill-PPPoE-Profile" \
    local-address=$IsolirGateway \
    remote-address=pool-isolir-gigabill \
    use-encryption=yes \
    only-one=yes \
    comment="Profile dasar PPPoE terintegrasi GigaBill"

# Profil Khusus Isolir
/ppp profile add \
    name="ISOLIR" \
    local-address=$IsolirGateway \
    remote-address=pool-isolir-gigabill \
    rate-limit="256k/256k" \
    comment="Profile Isolir Tagihan Menunggak"

# Konfigurasi PPPoE Server agar menggunakan RADIUS untuk autentikasi dan accounting
/interface pppoe-server server add \
    service-name="GigaBill-Internet" \
    interface=all \
    default-profile="GigaBill-PPPoE-Profile" \
    authentication=pap,chap,mschap1,mschap2 \
    one-session-per-host=yes \
    disabled=no

/ppp aaa set \
    use-radius=yes \
    accounting=yes \
    interim-update=00:05:00

# ------------------------------------------------------------------------------
# 6. FIREWALL ISOLIR & WALLED GARDEN (BYPASS QRIS & BILLING CHECK)
# ------------------------------------------------------------------------------
:log info "5/6. Menyiapkan Firewall Isolir & Walled Garden Payment..."

# 6.1. Tambahkan Domain / IP Bypass Walled Garden ke Address List
/ip firewall address-list add list=WALLED_GARDEN address=$GigaBillServerIP comment="Server GigaBill Core"
/ip firewall address-list add list=WALLED_GARDEN address="api.midtrans.com" comment="Midtrans PG"
/ip firewall address-list add list=WALLED_GARDEN address="app.midtrans.com" comment="Midtrans PG"
/ip firewall address-list add list=WALLED_GARDEN address="api.xendit.co" comment="Xendit PG"
/ip firewall address-list add list=WALLED_GARDEN address="checkout.xendit.co" comment="Xendit PG"

# 6.2. NAT Redirect HTTP (Port 80) pelanggan isolir ke Halaman Portal Tagihan
/ip firewall nat add \
    chain=dstnat \
    action=dst-nat \
    to-addresses=$PortalBillingIP \
    to-ports=$PortalBillingPort \
    protocol=tcp \
    dst-port=80 \
    src-address=$IsolirNetwork \
    dst-address-list=!WALLED_GARDEN \
    comment="Isolir: Redirect HTTP Pelanggan Menunggak ke Portal Tagihan"

/ip firewall nat add \
    chain=dstnat \
    action=dst-nat \
    to-addresses=$PortalBillingIP \
    to-ports=$PortalBillingPort \
    protocol=tcp \
    dst-port=80 \
    src-address-list=ISOLIR_LIST \
    dst-address-list=!WALLED_GARDEN \
    comment="Isolir: Redirect HTTP Address-List ke Portal Tagihan"

# 6.3. Filter Rules: Izinkan DNS, Izinkan Akses ke Walled Garden, Blokir Akses Lainnya
/ip firewall filter add \
    chain=forward \
    action=accept \
    protocol=udp \
    dst-port=53 \
    src-address=$IsolirNetwork \
    comment="Isolir: Izinkan DNS UDP 53"

/ip firewall filter add \
    chain=forward \
    action=accept \
    protocol=tcp \
    dst-port=53 \
    src-address=$IsolirNetwork \
    comment="Isolir: Izinkan DNS TCP 53"

/ip firewall filter add \
    chain=forward \
    action=accept \
    src-address=$IsolirNetwork \
    dst-address-list=WALLED_GARDEN \
    comment="Isolir: Izinkan Akses ke Server Billing & Payment Gateway"

/ip firewall filter add \
    chain=forward \
    action=accept \
    src-address-list=ISOLIR_LIST \
    dst-address-list=WALLED_GARDEN \
    comment="Isolir: Izinkan Akses List ke Server Billing & Payment Gateway"

# Drop seluruh trafik internet lainnya bagi pelanggan yang menunggak
/ip firewall filter add \
    chain=forward \
    action=drop \
    src-address=$IsolirNetwork \
    comment="Isolir: Blokir Akses Internet Pelanggan Menunggak"

/ip firewall filter add \
    chain=forward \
    action=drop \
    src-address-list=ISOLIR_LIST \
    comment="Isolir: Blokir Akses Internet Address-List Menunggak"

# ------------------------------------------------------------------------------
# 7. SELESAI
# ------------------------------------------------------------------------------
:log info "6/6. Konfigurasi integrasi GigaBill selesai dengan sukses!"
:put "=========================================================="
:put "  KONFIGURASI GigaBill <-> MIKROTIK SELESAI DIPASANG!    "
:put "  - FreeRADIUS Client: $GigaBillServerIP (1812/1813)     "
:put "  - CoA RFC 3576 Port: 3799 (Incoming Accept: YES)      "
:put "  - User API: $RouterApiUser (Port 8728)                "
:put "  - Subnet Isolir: $IsolirNetwork                       "
:put "=========================================================="
