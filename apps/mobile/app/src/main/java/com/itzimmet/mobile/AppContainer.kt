package com.itzimmet.mobile

import android.content.Context
import androidx.datastore.preferences.preferencesDataStore
import com.itzimmet.mobile.data.AuthRepository
import com.itzimmet.mobile.data.InventoryRepository
import com.itzimmet.mobile.data.local.TokenStore
import com.itzimmet.mobile.data.remote.AuthInterceptor
import com.itzimmet.mobile.data.remote.RefreshApi
import com.itzimmet.mobile.data.remote.TokenAuthenticator
import com.itzimmet.mobile.data.remote.ZimmetApi
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

private val Context.dataStore by preferencesDataStore(name = "session")

/**
 * Bağımlılıkları tek yerde oluşturan basit bir container. Proje küçük olduğu için
 * Hilt yerine elle kurulum tercih edildi.
 */
class AppContainer(context: Context) {

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    val tokenStore = TokenStore(context.dataStore)

    private val baseClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private fun retrofit(client: OkHttpClient) = Retrofit.Builder()
        .baseUrl(BuildConfig.API_URL)
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    // Yenileme isteği authenticator'sız istemciyle gider, yoksa kendi kendini çağırabilirdi.
    private val refreshApi = retrofit(baseClient).create(RefreshApi::class.java)

    private val api: ZimmetApi by lazy {
        val client = baseClient.newBuilder()
            .addInterceptor(AuthInterceptor(tokenStore))
            .authenticator(TokenAuthenticator(tokenStore, refreshApi) { authRepository.onSessionExpired() })
            .build()
        retrofit(client).create(ZimmetApi::class.java)
    }

    val authRepository: AuthRepository by lazy { AuthRepository(api, tokenStore) }
    val inventoryRepository: InventoryRepository by lazy { InventoryRepository(api) }
}
