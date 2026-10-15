package com.itzimmet.mobile.data.remote

import com.itzimmet.mobile.data.local.TokenStore
import okhttp3.Interceptor
import okhttp3.Response

/** Her isteğe elimizdeki access token'ı ekler. */
class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.accessToken ?: return chain.proceed(chain.request())
        val request = chain.request().newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
        return chain.proceed(request)
    }
}
