package com.itzimmet.mobile.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.itzimmet.mobile.data.remote.TokenPair
import kotlinx.coroutines.flow.first

/**
 * Web'deki gibi: access token sadece bellekte, refresh token ise DataStore'da
 * tutulur ki uygulama kapanıp açılınca oturum devam etsin.
 */
class TokenStore(private val dataStore: DataStore<Preferences>) {

    @Volatile
    var accessToken: String? = null
        private set

    @Volatile
    var refreshToken: String? = null
        private set

    suspend fun load() {
        refreshToken = dataStore.data.first()[REFRESH_TOKEN]
    }

    suspend fun save(tokens: TokenPair) {
        accessToken = tokens.accessToken
        refreshToken = tokens.refreshToken
        dataStore.edit { it[REFRESH_TOKEN] = tokens.refreshToken }
    }

    suspend fun clear() {
        accessToken = null
        refreshToken = null
        dataStore.edit { it.remove(REFRESH_TOKEN) }
    }

    private companion object {
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
    }
}
