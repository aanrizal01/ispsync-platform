package id.net.gogiga.agent

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStream
import java.text.NumberFormat
import java.util.Locale
import java.util.UUID

class BluetoothPrinterManager(private val context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("gogiga_printer_prefs", Context.MODE_PRIVATE)

    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()

    companion object {
        private const val TAG = "BTPrinter"
        // Standard SPP UUID for serial Bluetooth Thermal Printers
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
        private const val PREF_KEY_MAC = "printer_mac_address"
        private const val PREF_KEY_NAME = "printer_name"
        private const val PREF_KEY_PAPER = "paper_size" // "58mm" or "80mm"
    }

    var selectedDeviceMac: String?
        get() = prefs.getString(PREF_KEY_MAC, null)
        set(value) = prefs.edit().putString(PREF_KEY_MAC, value).apply()

    var selectedDeviceName: String?
        get() = prefs.getString(PREF_KEY_NAME, null)
        set(value) = prefs.edit().putString(PREF_KEY_NAME, value).apply()

    var paperSize: String
        get() = prefs.getString(PREF_KEY_PAPER, "58mm") ?: "58mm"
        set(value) = prefs.edit().putString(PREF_KEY_PAPER, value).apply()

    @SuppressLint("MissingPermission")
    fun getPairedPrinters(): List<BluetoothDevice> {
        val adapter = bluetoothAdapter ?: return emptyList()
        if (!adapter.isEnabled) return emptyList()
        return adapter.bondedDevices?.toList() ?: emptyList()
    }

    suspend fun testPrint(): Result<String> = withContext(Dispatchers.IO) {
        val mac = selectedDeviceMac
            ?: return@withContext Result.failure(Exception("Belum ada printer Bluetooth yang dipilih. Silakan atur printer terlebih dahulu."))

        try {
            val bytes = buildTestReceipt(paperSize)
            sendRawBytes(mac, bytes)
            Result.success("Tes cetak berhasil dikirim ke $selectedDeviceName!")
        } catch (e: Exception) {
            Log.e(TAG, "Test print error", e)
            Result.failure(Exception("Gagal mencetak: ${e.message}"))
        }
    }

    suspend fun printVouchers(vouchersJson: String, customPaperSize: String? = null): Result<String> =
        withContext(Dispatchers.IO) {
            val mac = selectedDeviceMac
                ?: return@withContext Result.failure(Exception("Printer Bluetooth belum dipilih. Silakan buka Pengaturan Printer."))

            val paper = customPaperSize ?: paperSize

            try {
                val array = JSONArray(vouchersJson)
                val allBytes = mutableListOf<Byte>()

                for (i in 0 until array.length()) {
                    val item = array.getJSONObject(i)
                    val receiptBytes = buildVoucherReceipt(item, paper)
                    allBytes.addAll(receiptBytes.toList())
                }

                sendRawBytes(mac, allBytes.toByteArray())
                Result.success("Berhasil mencetak ${array.length()} voucher ke $selectedDeviceName.")
            } catch (e: Exception) {
                Log.e(TAG, "Print vouchers error", e)
                Result.failure(Exception("Gagal mencetak: ${e.message}"))
            }
        }

    @SuppressLint("MissingPermission")
    private fun sendRawBytes(macAddress: String, data: ByteArray) {
        val adapter = bluetoothAdapter ?: throw Exception("Bluetooth tidak didukung pada perangkat ini")
        val device = adapter.getRemoteDevice(macAddress)
            ?: throw Exception("Perangkat printer tidak ditemukan ($macAddress)")

        var socket: BluetoothSocket? = null
        var outputStream: OutputStream? = null

        try {
            // Cancel discovery to avoid slowdown
            adapter.cancelDiscovery()

            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            socket.connect()
            outputStream = socket.outputStream
            outputStream.write(data)
            outputStream.flush()
        } finally {
            try {
                outputStream?.close()
                socket?.close()
            } catch (ignored: Exception) {
            }
        }
    }

    private fun buildVoucherReceipt(item: JSONObject, paper: String): ByteArray {
        val cols = if (paper == "80mm") 48 else 32
        val b = EscPosHelper(cols)

        val code = item.optString("code", "-")
        val password = item.optString("password", "")
        val templateName = item.optString("template_name", "VOUCHER HOTSPOT")
        val price = item.optLong("price", 0)
        val agentName = item.optString("agent_name", "")
        val createdAt = item.optString("created_at", "")

        val nf = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
        val priceStr = "Rp " + NumberFormat.getNumberInstance(Locale("id", "ID")).format(price)

        b.init()
        b.alignCenter()
        b.bold(true)
        b.textSize(1, 2)
        b.line("GOGIGA HOTSPOT")
        b.textSize(1, 1)
        b.bold(false)
        b.line("Internet Cepat & Terjangkau")
        b.separator("-")

        b.bold(true)
        b.line(templateName.uppercase())
        b.bold(false)
        b.separator("-")

        b.line("KODE LOGIN:")
        b.bold(true)
        b.textSize(2, 2)
        b.line(code)
        b.textSize(1, 1)
        b.bold(false)

        if (password.isNotEmpty() && password != code) {
            b.line("Password: $password")
        }
        b.separator("-")

        b.alignLeft()
        b.twoColumn("Tarif:", priceStr)
        if (agentName.isNotEmpty()) {
            b.twoColumn("Mitra:", agentName)
        }
        b.separator("-")

        b.bold(true)
        b.line("CARA LOGIN:")
        b.bold(false)
        b.line("1. Hubungkan WiFi: @GOGIGANET")
        b.line("2. Buka browser: hot.gogiga.net.id")
        b.line("3. Masukkan Kode Login di atas")

        b.separator("-")
        b.alignCenter()
        b.line("Terima kasih atas kunjungan Anda!")
        if (createdAt.isNotEmpty()) {
            b.line(createdAt)
        }

        b.feed(3)
        return b.toByteArray()
    }

    private fun buildTestReceipt(paper: String): ByteArray {
        val cols = if (paper == "80mm") 48 else 32
        val b = EscPosHelper(cols)

        b.init()
        b.alignCenter()
        b.bold(true)
        b.textSize(1, 2)
        b.line("TES PRINTER GOGIGA")
        b.textSize(1, 1)
        b.bold(false)
        b.separator("=")

        b.line("Status: PRINTER TERHUBUNG OK!")
        b.line("Tipe Kertas: $paper ($cols Kolom)")
        b.line("Perangkat: ${selectedDeviceName ?: "-"}")
        b.line("MAC: ${selectedDeviceMac ?: "-"}")
        b.separator("-")

        b.alignLeft()
        b.twoColumn("Kecepatan Cetak:", "Direct SPP OK")
        b.twoColumn("Encoding ESC/POS:", "ASCII/CP437")

        b.separator("=")
        b.alignCenter()
        b.line("Siap digunakan untuk mencetak voucher!")
        b.feed(3)
        return b.toByteArray()
    }
}

// ── Lightweight ESC/POS Helper ──────────────────────────────────────
class EscPosHelper(private val cols: Int) {
    private val buffer = mutableListOf<Byte>()

    fun init() {
        buffer.add(0x1B.toByte())
        buffer.add(0x40.toByte()) // ESC @
    }

    fun alignCenter() {
        buffer.add(0x1B.toByte())
        buffer.add(0x61.toByte())
        buffer.add(0x01.toByte()) // ESC a 1
    }

    fun alignLeft() {
        buffer.add(0x1B.toByte())
        buffer.add(0x61.toByte())
        buffer.add(0x00.toByte()) // ESC a 0
    }

    fun bold(enable: Boolean) {
        buffer.add(0x1B.toByte())
        buffer.add(0x45.toByte())
        buffer.add(if (enable) 0x01.toByte() else 0x00.toByte())
    }

    fun textSize(wMult: Int, hMult: Int) {
        val w = (wMult - 1).coerceIn(0, 7)
        val h = (hMult - 1).coerceIn(0, 7)
        val n = (w shl 4) or h
        buffer.add(0x1D.toByte())
        buffer.add(0x21.toByte())
        buffer.add(n.toByte())
    }

    fun text(str: String) {
        for (ch in str) {
            val code = ch.code
            buffer.add(if (code < 128) code.toByte() else '?'.code.toByte())
        }
    }

    fun line(str: String = "") {
        text(str)
        buffer.add(0x0A.toByte()) // LF
    }

    fun separator(char: String = "-") {
        line(char.repeat(cols / char.length))
    }

    fun twoColumn(left: String, right: String) {
        val spaces = (cols - left.length - right.length).coerceAtLeast(1)
        line(left + " ".repeat(spaces) + right)
    }

    fun feed(lines: Int = 3) {
        for (i in 0 until lines) {
            buffer.add(0x0A.toByte())
        }
    }

    fun toByteArray(): ByteArray = buffer.toByteArray()
}
