package com.itzimmet.mobile.ui.navigation

import kotlinx.serialization.Serializable

// Navigation Compose'un tip güvenli rotaları: argümanlar String yerine sınıf alanı olarak taşınıyor.

@Serializable
data object HomeRoute

@Serializable
data class DeviceDetailRoute(val id: String)
