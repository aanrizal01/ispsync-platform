package id.net.gogiga.agent

import android.content.Context
import android.webkit.JavascriptInterface
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class WebAppInterface(
    private val activity: MainActivity,
    private val printerManager: BluetoothPrinterManager
) {

    @JavascriptInterface
    fun isAvailable(): Boolean = true

    @JavascriptInterface
    fun openSettings() {
        activity.runOnUiThread {
            PrinterSettingsDialog(activity, printerManager).show()
        }
    }

    @JavascriptInterface
    fun testPrint() {
        CoroutineScope(Dispatchers.Main).launch {
            Toast.makeText(activity, "Mengirim tes cetak...", Toast.LENGTH_SHORT).show()
            val res = printerManager.testPrint()
            res.onSuccess {
                Toast.makeText(activity, it, Toast.LENGTH_SHORT).show()
            }.onFailure {
                Toast.makeText(activity, it.message, Toast.LENGTH_LONG).show()
            }
        }
    }

    @JavascriptInterface
    fun printVouchers(jsonString: String, paperSize: String?) {
        CoroutineScope(Dispatchers.Main).launch {
            Toast.makeText(activity, "Mencetak voucher via Bluetooth...", Toast.LENGTH_SHORT).show()
            val res = printerManager.printVouchers(jsonString, paperSize)
            res.onSuccess {
                Toast.makeText(activity, it, Toast.LENGTH_SHORT).show()
            }.onFailure {
                Toast.makeText(activity, it.message, Toast.LENGTH_LONG).show()
            }
        }
    }

    @JavascriptInterface
    fun getPrinterInfo(): String {
        val obj = JSONObject()
        obj.put("mac", printerManager.selectedDeviceMac ?: "")
        obj.put("name", printerManager.selectedDeviceName ?: "Belum dipilih")
        obj.put("paper", printerManager.paperSize)
        return obj.toString()
    }

    @JavascriptInterface
    fun shareWhatsApp(text: String, phoneNumber: String?) {
        activity.runOnUiThread {
            try {
                val cleanPhone = phoneNumber?.replace("+", "")?.replace(" ", "")?.replace("-", "") ?: ""
                val uri = if (cleanPhone.isNotEmpty()) {
                    android.net.Uri.parse("https://api.whatsapp.com/send?phone=$cleanPhone&text=${android.net.Uri.encode(text)}")
                } else {
                    android.net.Uri.parse("https://api.whatsapp.com/send?text=${android.net.Uri.encode(text)}")
                }
                val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, uri)
                intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                activity.startActivity(intent)
            } catch (e: Exception) {
                try {
                    val fallbackIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                        type = "text/plain"
                        putExtra(android.content.Intent.EXTRA_TEXT, text)
                        flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    activity.startActivity(android.content.Intent.createChooser(fallbackIntent, "Bagikan via WhatsApp"))
                } catch (ex: Exception) {
                    Toast.makeText(activity, "Gagal membuka WhatsApp", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    @JavascriptInterface
    fun shareGeneral(text: String, title: String?) {
        activity.runOnUiThread {
            try {
                val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(android.content.Intent.EXTRA_TEXT, text)
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                }
                activity.startActivity(android.content.Intent.createChooser(intent, title ?: "Bagikan"))
            } catch (e: Exception) {
                Toast.makeText(activity, "Gagal membagikan", Toast.LENGTH_SHORT).show()
            }
        }
    }
}

