package com.itzimmet.mobile.util

// Web'deki apps/web/src/lib/labels.ts ile aynı tutulmalı.

val DEVICE_TYPE_LABELS = mapOf(
    "LAPTOP" to "Dizüstü Bilgisayar",
    "DESKTOP" to "Masaüstü Bilgisayar",
    "SERVER" to "Sunucu",
    "MONITOR" to "Monitör",
    "PRINTER" to "Yazıcı",
    "NETWORK" to "Ağ Cihazı",
    "PHONE" to "Telefon",
    "TABLET" to "Tablet",
    "PERIPHERAL" to "Çevre Birimi",
    "OTHER" to "Diğer",
)

val DEVICE_STATUS_LABELS = mapOf(
    "IN_STOCK" to "Stokta",
    "ASSIGNED" to "Zimmetli",
    "FAULTY" to "Arızalı",
    "IN_REPAIR" to "Tamirde",
    "RETIRED" to "Hurdaya Ayrıldı",
)

val DEVICE_EVENT_LABELS = mapOf(
    "CREATED" to "Envantere eklendi",
    "UPDATED" to "Bilgiler güncellendi",
    "ASSIGNED" to "Zimmetlendi",
    "RETURNED" to "İade alındı",
    "STATUS_CHANGED" to "Durum değişti",
    "FAULT_REPORTED" to "Arıza bildirildi",
    "DELETED" to "Silindi",
)

val ROLE_LABELS = mapOf(
    "ADMIN" to "Yönetici",
    "STAFF" to "Personel",
)

fun deviceTypeLabel(type: String) = DEVICE_TYPE_LABELS[type] ?: type
fun deviceStatusLabel(status: String) = DEVICE_STATUS_LABELS[status] ?: status
fun deviceEventLabel(type: String) = DEVICE_EVENT_LABELS[type] ?: type
fun roleLabel(role: String) = ROLE_LABELS[role] ?: role
