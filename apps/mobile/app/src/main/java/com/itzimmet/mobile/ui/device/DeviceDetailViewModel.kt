package com.itzimmet.mobile.ui.device

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.toRoute
import com.itzimmet.mobile.data.InventoryRepository
import com.itzimmet.mobile.data.remote.Device
import com.itzimmet.mobile.data.remote.toUserMessage
import com.itzimmet.mobile.ui.UiState
import com.itzimmet.mobile.ui.container
import com.itzimmet.mobile.ui.navigation.DeviceDetailRoute
import kotlinx.coroutines.launch

class DeviceDetailViewModel(
    savedStateHandle: SavedStateHandle,
    private val repository: InventoryRepository,
) : ViewModel() {

    // Cihaz id'si navigasyon argümanından gelir.
    private val deviceId = savedStateHandle.toRoute<DeviceDetailRoute>().id

    var state by mutableStateOf<UiState<Device>>(UiState.Loading)
        private set

    init {
        load()
    }

    fun load() {
        state = UiState.Loading
        viewModelScope.launch {
            state = runCatching { repository.device(deviceId) }
                .fold({ UiState.Success(it) }, { UiState.Error(it.toUserMessage()) })
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { DeviceDetailViewModel(createSavedStateHandle(), container.inventoryRepository) }
        }
    }
}
