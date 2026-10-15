package com.itzimmet.mobile.data.remote

import com.itzimmet.mobile.data.local.TokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

/**
 * API 401 döndüğünde OkHttp burayı çağırır. Refresh token ile yeni token alınır
 * ve istek bir kez daha gönderilir.
 *
 * Her refresh token sadece bir kez kullanılabiliyor; aynı token ikinci kez gelirse
 * API bunu çalıntı sayıp tüm oturumları kapatıyor. Bu yüzden yenileme synchronized:
 * aynı anda 401 alan istekler sırayla girer, ilk giren yeniler, diğerleri onun
 * aldığı token'ı kullanır.
 */
class TokenAuthenticator(
    private val tokenStore: TokenStore,
    private val refreshApi: RefreshApi,
    private val onSessionExpired: () -> Unit,
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        // Yanlış şifreyle girişte de 401 geliyor, orada yenilenecek bir şey yok.
        if (response.request.url.encodedPath.endsWith("/auth/login")) return null
        // Yeni token'la da 401 aldıysak tekrar denemenin anlamı yok.
        if (response.priorResponse != null) return null

        synchronized(this) {
            val sentToken = response.request.header("Authorization")?.removePrefix("Bearer ")
            val currentToken = tokenStore.accessToken
            if (currentToken != null && currentToken != sentToken) {
                return response.request.withToken(currentToken)
            }

            val refreshToken = tokenStore.refreshToken ?: return null
            val result = runCatching { refreshApi.refresh(RefreshRequest(refreshToken)).execute() }
                .getOrElse { return null } // Ağ hatası: oturumu kapatmıyoruz, sadece istek başarısız olur.

            val tokens = result.body()
            if (!result.isSuccessful || tokens == null) {
                runBlocking { tokenStore.clear() }
                onSessionExpired()
                return null
            }

            runBlocking { tokenStore.save(tokens) }
            return response.request.withToken(tokens.accessToken)
        }
    }

    private fun Request.withToken(token: String) =
        newBuilder().header("Authorization", "Bearer $token").build()
}
