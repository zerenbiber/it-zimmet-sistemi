package com.itzimmet.mobile.data.remote

import kotlinx.serialization.json.Json
import retrofit2.HttpException
import java.io.IOException

private val errorJson = Json { ignoreUnknownKeys = true }

/** API'nin Türkçe hata mesajını çıkarır; ağ hatalarında anlaşılır bir mesaj döner. */
fun Throwable.toUserMessage(): String = when (this) {
    is HttpException -> response()?.errorBody()?.string()
        ?.let { runCatching { errorJson.decodeFromString<ErrorBody>(it).error.message }.getOrNull() }
        ?: "Sunucu hatası (${code()})."
    is IOException -> "Sunucuya ulaşılamadı. Bağlantınızı ve API adresini kontrol edin."
    else -> "Beklenmeyen bir hata oluştu."
}
