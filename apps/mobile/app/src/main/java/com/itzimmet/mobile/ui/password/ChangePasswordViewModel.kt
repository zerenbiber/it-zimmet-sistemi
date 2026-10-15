package com.itzimmet.mobile.ui.password

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

/** API'deki şifre kuralının aynısı (apps/api/src/lib/password.ts), hatalar yazarken görünsün diye. */
val PASSWORD_RULES: List<Pair<String, (String) -> Boolean>> = listOf(
    "En az 10 karakter" to { it.length >= 10 },
    "En az bir küçük harf" to { p -> p.any { it in 'a'..'z' || it in "çğıöşü" } },
    "En az bir büyük harf" to { p -> p.any { it in 'A'..'Z' || it in "ÇĞİÖŞÜ" } },
    "En az bir rakam" to { p -> p.any(Char::isDigit) },
)

class ChangePasswordViewModel(private val authRepository: AuthRepository) : ViewModel() {

    var currentPassword by mutableStateOf("")
    var newPassword by mutableStateOf("")
    var repeatPassword by mutableStateOf("")
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    val passwordsMatch get() = repeatPassword.isNotEmpty() && newPassword == repeatPassword

    val canSubmit
        get() = currentPassword.isNotEmpty() &&
            PASSWORD_RULES.all { (_, check) -> check(newPassword) } &&
            passwordsMatch &&
            !isLoading

    fun submit() {
        if (!canSubmit) return
        isLoading = true
        error = null
        viewModelScope.launch {
            runCatching { authRepository.changePassword(currentPassword, newPassword) }
                .onSuccess {
                    currentPassword = ""
                    newPassword = ""
                    repeatPassword = ""
                }
                .onFailure { error = it.toUserMessage() }
            isLoading = false
        }
    }

    fun logout() {
        viewModelScope.launch { authRepository.logout() }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { ChangePasswordViewModel(container.authRepository) }
        }
    }
}
