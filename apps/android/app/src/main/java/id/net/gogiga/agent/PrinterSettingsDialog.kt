package id.net.gogiga.agent

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.widget.ArrayAdapter
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class PrinterSettingsDialog(
    private val context: Context,
    private val printerManager: BluetoothPrinterManager
) {

    @SuppressLint("MissingPermission")
    fun show() {
        val pairedDevices = printerManager.getPairedPrinters()

        if (pairedDevices.isEmpty()) {
            AlertDialog.Builder(context)
                .setTitle("Printer Bluetooth Tidak Ditemukan")
                .setMessage("Belum ada printer Bluetooth yang dipasangkan (paired) di HP ini.\n\nSilakan buka Pengaturan Bluetooth HP, nyalakan printer thermal Anda, lalu pasangkan (pair) terlebih dahulu.")
                .setPositiveButton("OK", null)
                .show()
            return
        }

        val deviceNames = pairedDevices.map { "${it.name ?: "Unknown"} (${it.address})" }.toTypedArray()
        var selectedIndex = pairedDevices.indexOfFirst { it.address == printerManager.selectedDeviceMac }
        if (selectedIndex == -1) selectedIndex = 0

        AlertDialog.Builder(context)
            .setTitle("Pilih Printer Bluetooth")
            .setSingleChoiceItems(deviceNames, selectedIndex) { _, which ->
                selectedIndex = which
            }
            .setPositiveButton("Simpan & Jadikan Default") { _, _ ->
                val device = pairedDevices[selectedIndex]
                printerManager.selectedDeviceMac = device.address
                printerManager.selectedDeviceName = device.name ?: "Thermal Printer"
                Toast.makeText(context, "Printer default: ${printerManager.selectedDeviceName}", Toast.LENGTH_SHORT).show()
                showPaperSizeOptions()
            }
            .setNeutralButton("Tes Cetak") { _, _ ->
                val device = pairedDevices[selectedIndex]
                printerManager.selectedDeviceMac = device.address
                printerManager.selectedDeviceName = device.name ?: "Thermal Printer"

                CoroutineScope(Dispatchers.Main).launch {
                    Toast.makeText(context, "Mengirim tes cetak...", Toast.LENGTH_SHORT).show()
                    val result = printerManager.testPrint()
                    result.onSuccess {
                        Toast.makeText(context, it, Toast.LENGTH_LONG).show()
                    }.onFailure {
                        Toast.makeText(context, it.message, Toast.LENGTH_LONG).show()
                    }
                }
            }
            .setNegativeButton("Batal", null)
            .show()
    }

    private fun showPaperSizeOptions() {
        val options = arrayOf("58 mm (32 Kolom - Standar Mini POS)", "80 mm (48 Kolom - Lebar)")
        val current = if (printerManager.paperSize == "80mm") 1 else 0

        AlertDialog.Builder(context)
            .setTitle("Pilih Ukuran Kertas Thermal")
            .setSingleChoiceItems(options, current) { dialog, which ->
                printerManager.paperSize = if (which == 1) "80mm" else "58mm"
                Toast.makeText(context, "Ukuran kertas disetel ke ${printerManager.paperSize}", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
            .show()
    }
}
