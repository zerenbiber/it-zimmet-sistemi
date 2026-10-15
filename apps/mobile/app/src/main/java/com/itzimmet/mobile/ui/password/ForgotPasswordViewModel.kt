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

enum class ForgotStep { EMAIL, CODE, DONE }

/** İki adım: önce e-postaya kod istenir, sonra kod ve yeni şifre girilir. */
class ForgotPasswordViewModel(private val authRepository: AuthRepository) : ViewModel() {

    var step by mutableStateOf(ForgotStep.EMAIL)
        private set
    var email by mutableStateOf("")
    var code by mutableStateOf("")
        private set
    var newPassword by mutableStateOf("")
    var repeatPassword by mutableStateOf("")
    var isLoading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    val passwordsMatch get() = repeatPassword.isNotEmpty() && newPassword == repeatPassword

    val canReset
        get() = code.length == 6 &&
            PASSWORD_RULES.all { (_, check) -> check(newPassword) } &&
            passwordsMatch &&
            !isLoading

    /** Koda sadece rakam yazılabilsin. */
    fun onCodeChange(value: String) {
        code = value.filter(Char::isDigit).take(6)
    }

    fun sendCode() {
        if (email.isBlank() || isLoading) return
        run {
            authRepository.requestPasswordReset(email)
            code = ""
            step = ForgotStep.CODE
        }
    }

    fun resetPassword() {
        if (!canReset) return
        run {
            authRepository.resetPassword(email, code, newPassword)
            newPassword = ""
            repeatPassword = ""
            step = ForgotStep.DONE
        }
    }

    private fun run(action: suspend () -> Unit) {
        isLoading = true
        error = null
        viewModelScope.launch {
            runCatching { action() }.onFailure { error = it.toUserMessage() }
            isLoading = false
        }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { ForgotPasswordViewModel(container.authRepository) }
        }
    }
}
