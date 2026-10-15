package com.itzimmet.mobile.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.itzimmet.mobile.BuildConfig
import com.itzimmet.mobile.data.remote.CurrentUser
import com.itzimmet.mobile.ui.components.InfoRow
import com.itzimmet.mobile.ui.components.Pill
import com.itzimmet.mobile.ui.components.SectionCard
import com.itzimmet.mobile.ui.theme.LocalTones
import com.itzimmet.mobile.util.roleLabel

@Composable
fun ProfileScreen(user: CurrentUser, onLogout: () -> Unit, modifier: Modifier = Modifier) {
    var confirmLogout by rememberSaveable { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .wrapContentWidth()
            .widthIn(max = 560.dp)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .padding(top = 8.dp)
                .size(80.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "${user.firstName.take(1)}${user.lastName.take(1)}".uppercase(),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
        Text(user.fullName, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        Pill(roleLabel(user.role), if (user.isAdmin) LocalTones.current.info else LocalTones.current.neutral)

        SectionCard {
            InfoRow("E-posta", user.email)
            InfoRow("Departman", user.department?.name ?: "—")
            InfoRow("Unvan", user.title ?: "—")
            InfoRow("Telefon", user.phone ?: "—")
        }

        OutlinedButton(
            onClick = { confirmLogout = true },
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
        ) {
            Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
            Text("Çıkış yap", modifier = Modifier.padding(start = 8.dp))
        }

        Text(
            "Sürüm ${BuildConfig.VERSION_NAME} · ${BuildConfig.API_URL}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline,
        )
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            title = { Text("Çıkış yapılsın mı?") },
            text = { Text("Tekrar girmek için e-posta ve şifreniz gerekecek.") },
            confirmButton = {
                TextButton(onClick = { confirmLogout = false; onLogout() }) { Text("Çıkış yap") }
            },
            dismissButton = {
                TextButton(onClick = { confirmLogout = false }) { Text("Vazgeç") }
            },
        )
    }
}
