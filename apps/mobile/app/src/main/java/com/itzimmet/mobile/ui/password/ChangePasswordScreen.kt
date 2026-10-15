package com.itzimmet.mobile.ui.password

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.itzimmet.mobile.ui.components.FormError
import com.itzimmet.mobile.ui.components.PasswordField
import com.itzimmet.mobile.ui.components.SectionCard
import com.itzimmet.mobile.ui.login.AppLogo
import com.itzimmet.mobile.ui.theme.LocalTones

/** Kullanıcı geçici şifreyle girdiyse uygulama yerine bu ekran açılır. */
@Composable
fun ChangePasswordScreen(viewModel: ChangePasswordViewModel = viewModel(factory = ChangePasswordViewModel.Factory)) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .safeDrawingPadding()
            .imePadding()
            .wrapContentWidth()
            .widthIn(max = 440.dp)
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        AppLogo()
        Text("Yeni şifre belirleyin", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)
        Text(
            "Geçici şifreyle giriş yaptınız. Devam etmek için kendi şifrenizi belirlemeniz gerekiyor.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        PasswordField(viewModel.currentPassword, { viewModel.currentPassword = it }, "Mevcut (geçici) şifre")
        PasswordField(viewModel.newPassword, { viewModel.newPassword = it }, "Yeni şifre")
        PasswordField(viewModel.repeatPassword, { viewModel.repeatPassword = it }, "Yeni şifre (tekrar)")

        PasswordChecklist(viewModel.newPassword, viewModel.passwordsMatch)

        viewModel.error?.let { FormError(it) }

        Button(
            onClick = viewModel::submit,
            enabled = viewModel.canSubmit,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
        ) {
            if (viewModel.isLoading) {
                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Şifreyi kaydet", fontWeight = FontWeight.SemiBold)
            }
        }
        TextButton(onClick = viewModel::logout, modifier = Modifier.align(Alignment.CenterHorizontally)) {
            Text("Çıkış yap")
        }
    }
}

/** Şifre kuralları; yazdıkça sağlananlar yeşile döner. */
@Composable
fun PasswordChecklist(password: String, passwordsMatch: Boolean) {
    SectionCard {
        PASSWORD_RULES.forEach { (label, check) -> RuleRow(label, check(password)) }
        RuleRow("Şifreler eşleşiyor", passwordsMatch)
    }
}

@Composable
private fun RuleRow(label: String, ok: Boolean) {
    val color = if (ok) LocalTones.current.good.text else MaterialTheme.colorScheme.outline
    Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = if (ok) Icons.Outlined.CheckCircle else Icons.Outlined.RadioButtonUnchecked,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = if (ok) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
