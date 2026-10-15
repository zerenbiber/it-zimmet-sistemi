package com.itzimmet.mobile.ui.assignments

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.itzimmet.mobile.data.InventoryRepository
import com.itzimmet.mobile.data.remote.Assignment
import com.itzimmet.mobile.data.remote.toUserMessage
import com.itzimmet.mobile.ui.UiState
import com.itzimmet.mobile.ui.container
import kotlinx.coroutines.launch

class MyAssignmentsViewModel(
    private val userId: String,
    private val repository: InventoryRepository,
) : ViewModel() {

    var state by mutableStateOf<UiState<List<Assignment>>>(UiState.Loading)
        private set

    /** Aşağı çekip yenilerken liste ekranda kalsın diye ayrı tutuluyor. */
    var isRefreshing by mutableStateOf(false)
        private set

    init {
        load()
    }

    fun load() {
        state = UiState.Loading
        viewModelScope.launch { fetch() }
    }

    fun refresh() {
        isRefreshing = true
        viewModelScope.launch {
            fetch()
            isRefreshing = false
        }
    }

    private suspend fun fetch() {
        state = runCatching { repository.myAssignments(userId) }
            .fold({ UiState.Success(it) }, { UiState.Error(it.toUserMessage()) })
    }

    companion object {
        fun factory(userId: String) = viewModelFactory {
            initializer { MyAssignmentsViewModel(userId, container.inventoryRepository) }
        }
    }
}
