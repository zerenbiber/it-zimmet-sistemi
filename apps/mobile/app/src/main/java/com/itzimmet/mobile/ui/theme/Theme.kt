package com.itzimmet.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Renkler web arayüzündeki styles.css değişkenlerinden alındı, iki taraf aynı görünsün.

private val LightColors = lightColorScheme(
    primary = Color(0xFF5B5BD6),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFEEF0FF),
    onPrimaryContainer = Color(0xFF4338CA),
    background = Color(0xFFF7F7F5),
    onBackground = Color(0xFF111318),
    surface = Color(0xFFF7F7F5),
    onSurface = Color(0xFF111318),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color.White,
    surfaceContainerHigh = Color(0xFFF3F3F1),
    surfaceVariant = Color(0xFFF3F3F1),
    onSurfaceVariant = Color(0xFF4B5060),
    outline = Color(0xFF8A8F9C),
    outlineVariant = Color(0xFFE6E6E9),
    error = Color(0xFFB91C1C),
    errorContainer = Color(0xFFFEF2F2),
    onErrorContainer = Color(0xFFB91C1C),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF7C83F5),
    onPrimary = Color.White,
    primaryContainer = Color(0xFF262B4D),
    onPrimaryContainer = Color(0xFFA5ABFF),
    background = Color(0xFF0D111C),
    onBackground = Color(0xFFE8EBF3),
    surface = Color(0xFF0D111C),
    onSurface = Color(0xFFE8EBF3),
    surfaceContainerLowest = Color(0xFF131826),
    surfaceContainerLow = Color(0xFF131826),
    surfaceContainer = Color(0xFF131826),
    surfaceContainerHigh = Color(0xFF1A2032),
    surfaceVariant = Color(0xFF0F1421),
    onSurfaceVariant = Color(0xFFA9B0C2),
    outline = Color(0xFF727A90),
    outlineVariant = Color(0xFF232A3B),
    error = Color(0xFFFCA5A5),
    errorContainer = Color(0xFF3A1D24),
    onErrorContainer = Color(0xFFFCA5A5),
)

/** Durum rozetlerindeki renkler: dolgu (soft) ve yazı (text). */
@Immutable
data class Tone(val soft: Color, val text: Color)

@Immutable
data class Tones(
    val good: Tone,
    val info: Tone,
    val warning: Tone,
    val critical: Tone,
    val neutral: Tone,
)

private val LightTones = Tones(
    good = Tone(Color(0xFFECFDF3), Color(0xFF15803D)),
    info = Tone(Color(0xFFEFF6FF), Color(0xFF1D4ED8)),
    warning = Tone(Color(0xFFFFF8EB), Color(0xFFB45309)),
    critical = Tone(Color(0xFFFEF2F2), Color(0xFFB91C1C)),
    neutral = Tone(Color(0xFFF1F5F9), Color(0xFF475569)),
)

private val DarkTones = Tones(
    good = Tone(Color(0x1F22C55E), Color(0xFF4ADE80)),
    info = Tone(Color(0x1F60A5FA), Color(0xFF93C5FD)),
    warning = Tone(Color(0x1CFBBF24), Color(0xFFFCD34D)),
    critical = Tone(Color(0x1FF87171), Color(0xFFFCA5A5)),
    neutral = Tone(Color(0x1F94A3B8), Color(0xFFCBD5E1)),
)

val LocalTones = staticCompositionLocalOf { LightTones }

@Composable
fun ZimmetTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalTones provides if (darkTheme) DarkTones else LightTones) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColors else LightColors,
            content = content,
        )
    }
}
