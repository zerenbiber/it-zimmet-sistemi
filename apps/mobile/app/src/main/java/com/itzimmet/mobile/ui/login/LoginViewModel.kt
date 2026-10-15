package com.itzimmet.mobile.ui.login

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.itzimmet.mobile.data.AuthRepository
import com.itzimmet.mobile.data.remote.toUserMessage
import com.itzimmet.mobile.ui.container
import kotlinx.coroutines.launch

class LoginViewModel(private val authRepository: AuthRepository) : ViewModel() {

    var email by mutableStateOf("")
    var password by mutableStateOf("")
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    val canSubmit get() = email.isNotBlank() && password.isNotEmpty() && !isLoading

    // Başarılı girişte ekranı değiştirmeye gerek yok: oturum state'i değişince AppRoot giriş ekranını kaldırır.
    fun login() {
        if (!canSubmit) return
        isLoading = true
        error = null
        viewModelScope.launch {
            runCatching { authRepository.login(email, password) }
                // ViewModel activity boyunca yaşıyor; çıkış yapılınca şifre alanda dolu kalmasın.
                .onSuccess { password = "" }
                .onFailure { error = it.toUserMessage() }
            isLoading = false
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { LoginViewModel(container.authRepository) }
        }
    }
}
