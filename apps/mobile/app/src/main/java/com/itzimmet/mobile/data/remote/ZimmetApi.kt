package com.itzimmet.mobile.data.remote

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Mobilin kullandığı API uç noktaları. Tam liste README'de. */
interface ZimmetApi {

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/logout")
    suspend fun logout(@Body body: RefreshRequest)

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest)

    @POST("auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest)

    @GET("auth/me")
    suspend fun me(): MeResponse

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): AuthResponse

    /**
     * Admin'de userId verilmezse API herkesin zimmetini döner (web'deki Zimmetler sayfası bunu kullanıyor).
     * Personelde userId yok sayılır, API zaten sadece kendi zimmetlerini veriyor.
     */
    @GET("assignments")
    suspend fun assignments(
        @Query("userId") userId: String,
        @Query("pageSize") pageSize: Int = 100,
    ): Paginated<Assignment>

    @GET("devices/by-tag/{assetTag}")
    suspend fun deviceByTag(@Path("assetTag") assetTag: String): Device

    @GET("devices/{id}")
    suspend fun device(@Path("id") id: String): Device
}

/**
 * Token yenileme ayrı tutuldu: TokenAuthenticator bunu OkHttp'nin kendi thread'inde
 * senkron çağırıyor, bu yüzden suspend değil Call döndürüyor.
 */
interface RefreshApi {

    @POST("auth/refresh")
    fun refresh(@Body body: RefreshRequest): Call<TokenPair>
}
