package com.itzimmet.mobile.ui

import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras
import com.itzimmet.mobile.AppContainer
import com.itzimmet.mobile.ZimmetApplication

/** Veri yükleyen ekranların ortak durumu. */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Error(val message: String) : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
}

/** ViewModel factory'lerinde AppContainer'a ulaşmak için. */
val CreationExtras.container: AppContainer
    get() = (this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as ZimmetApplication).container
