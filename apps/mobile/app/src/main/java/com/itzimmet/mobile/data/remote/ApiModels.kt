package com.itzimmet.mobile.data.remote

import kotlinx.serialization.Serializable

// API'nin döndürdüğü JSON'ların karşılıkları. Alan adları web'deki api/types.ts ile aynı.
// Enum'lar (rol, durum, tür) String tutuluyor; Türkçe karşılıkları util/Labels.kt içinde.

@Serializable
data class Ref(val id: String, val name: String)

@Serializable
data class Person(val id: String, val firstName: String, val lastName: String) {
    val fullName get() = "$firstName $lastName"
}

@Serializable
data class CurrentUser(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val role: String,
    val title: String? = null,
    val phone: String? = null,
    val mustChangePassword: Boolean = false,
    val department: Ref? = null,
) {
    val fullName get() = "$firstName $lastName"
    val isAdmin get() = role == "ADMIN"
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RefreshRequest(val refreshToken: String)

@Serializable
data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)

@Serializable
data class ForgotPasswordRequest(val email: String)

@Serializable
data class ResetPasswordRequest(val email: String, val code: String, val newPassword: String)

@Serializable
data class TokenPair(val accessToken: String, val refreshToken: String)

/** Giriş ve şifre değiştirme cevabı: kullanıcı + yeni token çifti. */
@Serializable
data class AuthResponse(val user: CurrentUser, val accessToken: String, val refreshToken: String)

@Serializable
data class MeResponse(val user: CurrentUser)

// ─── Zimmet ───────────────────────────────────────────────────────────────────

@Serializable
data class Paginated<T>(
    val items: List<T>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
    val totalPages: Int,
)

@Serializable
data class AssignmentDevice(
    val id: String,
    val assetTag: String,
    val type: String,
    val brand: String,
    val model: String,
    val serialNumber: String,
)

@Serializable
data class Assignment(
    val id: String,
    val assignedAt: String,
    val assignNote: String? = null,
    val returnedAt: String? = null,
    val returnNote: String? = null,
    val device: AssignmentDevice,
    val assignedBy: Person,
) {
    val isActive get() = returnedAt == null
}

// ─── Cihaz ────────────────────────────────────────────────────────────────────

@Serializable
data class Assignee(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val department: Ref? = null,
) {
    val fullName get() = "$firstName $lastName"
}

@Serializable
data class CurrentAssignment(val id: String, val assignedAt: String, val user: Assignee)

@Serializable
data class DeviceEvent(
    val id: String,
    val type: String,
    val fromStatus: String? = null,
    val toStatus: String? = null,
    val description: String? = null,
    val createdAt: String,
    val performedBy: Person? = null,
)

/** /devices/by-tag geçmiş göndermez, o yüzden events boş liste olarak gelir. */
@Serializable
data class Device(
    val id: String,
    val assetTag: String,
    val type: String,
    val brand: String,
    val model: String,
    val serialNumber: String,
    val purchaseDate: String,
    val warrantyEndDate: String? = null,
    val status: String,
    val notes: String? = null,
    val currentAssignment: CurrentAssignment? = null,
    val events: List<DeviceEvent> = emptyList(),
)

// ─── Hata ─────────────────────────────────────────────────────────────────────

/** API hataları hep { "error": { "code", "message" } } biçiminde döner. */
@Serializable
data class ErrorBody(val error: ErrorDetail)

@Serializable
data class ErrorDetail(val code: String, val message: String)
