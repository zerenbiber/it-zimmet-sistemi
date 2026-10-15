package com.itzimmet.mobile.ui.scan

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.itzimmet.mobile.data.InventoryRepository
import com.itzimmet.mobile.data.remote.toUserMessage
import com.itzimmet.mobile.ui.container
import kotlinx.coroutines.launch

class ScanViewModel(private val repository: InventoryRepository) : ViewModel() {

    var manualTag by mutableStateOf("")
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    /** Bulunan cihazın id'si. Ekran buna bakıp detay sayfasına geçer, sonra consumeResult() çağırır. */
    var foundDeviceId by mutableStateOf<String?>(null)
        private set

    private var lastCode: String? = null
    private var lastCodeAt = 0L

    /** Kamera aynı kodu saniyede birkaç kez okuyor; aynı kod 3 sn içinde tekrar gelirse yok sayılır. */
    fun onCodeScanned(code: String) {
        val now = System.currentTimeMillis()
        if (isLoading || foundDeviceId != null) return
        if (code == lastCode && now - lastCodeAt < 3_000) return
        lastCode = code
        lastCodeAt = now
        lookup(code)
    }

    fun searchManual() {
        if (manualTag.isNotBlank() && !isLoading) lookup(manualTag)
    }

    fun consumeResult() {
        foundDeviceId = null
    }

    private fun lookup(assetTag: String) {
        isLoading = true
        error = null
        viewModelScope.launch {
            runCatching { repository.findByAssetTag(assetTag) }
                .onSuccess { foundDeviceId = it.id }
                .onFailure { error = it.toUserMessage() }
            isLoading = false
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { ScanViewModel(container.inventoryRepository) }
        }
    }
}
