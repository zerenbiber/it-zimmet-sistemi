package com.itzimmet.mobile.util

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

private val dateFormat = DateTimeFormatter.ofPattern("dd.MM.yyyy")
private val dateTimeFormat = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")

/** İşlem zamanları (zimmet, iade, olaylar) telefonun saat dilimine çevrilir. */
fun formatDateTime(iso: String): String =
    runCatching { Instant.parse(iso).atZone(ZoneId.systemDefault()).format(dateTimeFormat) }.getOrDefault(iso)

fun formatDate(iso: String): String =
    runCatching { Instant.parse(iso).atZone(ZoneId.systemDefault()).format(dateFormat) }.getOrDefault(iso)

/** Alım ve garanti tarihleri UTC gece yarısı saklanıyor, saat dilimine göre kaymasın diye UTC okunur. */
fun calendarDate(iso: String): LocalDate? =
    runCatching { Instant.parse(iso).atOffset(ZoneOffset.UTC).toLocalDate() }.getOrNull()

fun formatCalendarDate(iso: String): String = calendarDate(iso)?.format(dateFormat) ?: iso

/** Garantinin bitmesine kalan gün; geçmişse negatif. */
fun daysUntil(iso: String): Long? = calendarDate(iso)?.let { ChronoUnit.DAYS.between(LocalDate.now(), it) }
