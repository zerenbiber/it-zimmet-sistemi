package com.itzimmet.mobile.data

import com.itzimmet.mobile.data.local.TokenStore
import com.itzimmet.mobile.data.remote.ChangePasswordRequest
import com.itzimmet.mobile.data.remote.CurrentUser
import com.itzimmet.mobile.data.remote.ForgotPasswordRequest
import com.itzimmet.mobile.data.remote.LoginRequest
import com.itzimmet.mobile.data.remote.RefreshRequest
import com.itzimmet.mobile.data.remote.ResetPasswordRequest
import com.itzimmet.mobile.data.remote.TokenPair
import com.itzimmet.mobile.data.remote.ZimmetApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

sealed interface SessionState {
    data object Loading : SessionState
    data object LoggedOut : SessionState
    data class LoggedIn(val user: CurrentUser) : SessionState
}

/** Oturumun tek kaynağı. Arayüz hangi ekranı göstereceğine bu state'e bakarak karar verir. */
class AuthRepository(
    private val api: ZimmetApi,
    private val tokenStore: TokenStore,
) {
    private val _session = MutableStateFlow<SessionState>(SessionState.Loading)
    val session: StateFlow<SessionState> = _session.asStateFlow()

    /** Uygulama açılırken kayıtlı refresh token varsa oturumu geri getirir. */
    suspend fun restoreSession() {
        tokenStore.load()
        if (tokenStore.refreshToken == null) {
            _session.value = SessionState.LoggedOut
            return
        }
        // Access token bellekte olmadığı için ilk istek 401 alır, TokenAuthenticator yeniler.
        _session.value = runCatching { SessionState.LoggedIn(api.me().user) }
            .getOrDefault(SessionState.LoggedOut)
    }

    suspend fun login(email: String, password: String) {
        val response = api.login(LoginRequest(email.trim(), password))
        tokenStore.save(TokenPair(response.accessToken, response.refreshToken))
        _session.value = SessionState.LoggedIn(response.user)
    }

    /** API diğer oturumları kapatıp bu cihaz için yeni token çifti veriyor. */
    suspend fun changePassword(currentPassword: String, newPassword: String) {
        val response = api.changePassword(ChangePasswordRequest(currentPassword, newPassword))
        tokenStore.save(TokenPair(response.accessToken, response.refreshToken))
        _session.value = SessionState.LoggedIn(response.user)
    }

    /** E-postaya 6 haneli kod gönderilir. E-posta kayıtlı olmasa da API aynı cevabı verir. */
    suspend fun requestPasswordReset(email: String) {
        api.forgotPassword(ForgotPasswordRequest(email.trim()))
    }

    suspend fun resetPassword(email: String, code: String, newPassword: String) {
        api.resetPassword(ResetPasswordRequest(email.trim(), code, newPassword))
    }

    suspend fun logout() {
        tokenStore.refreshToken?.let { token ->
            // Sunucuya ulaşılamasa da telefondaki oturum kapatılır.
            runCatching { api.logout(RefreshRequest(token)) }
        }
        tokenStore.clear()
        _session.value = SessionState.LoggedOut
    }

    /** Refresh token geçersiz olduğunda TokenAuthenticator çağırır. */
    fun onSessionExpired() {
        _session.value = SessionState.LoggedOut
    }
}
