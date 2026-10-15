package com.itzimmet.mobile.ui.password

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.itzimmet.mobile.ui.components.FormError
import com.itzimmet.mobile.ui.components.Pill
import com.itzimmet.mobile.ui.components.PasswordField
import com.itzimmet.mobile.ui.components.TextInput
import com.itzimmet.mobile.ui.login.AppLogo
import com.itzimmet.mobile.ui.theme.LocalTones

@Composable
fun ForgotPasswordScreen(
    onBack: () -> Unit,
    viewModel: ForgotPasswordViewModel = viewModel(factory = ForgotPasswordViewModel.Factory),
) {
    BackHandler(onBack = onBack)

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
        Text("Şifremi unuttum", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.SemiBold)

        when (viewModel.step) {
            ForgotStep.EMAIL -> EmailStep(viewModel)
            ForgotStep.CODE -> CodeStep(viewModel)
            ForgotStep.DONE -> DoneStep(onBack)
        }

        if (viewModel.step != ForgotStep.DONE) {
            TextButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Text("Girişe dön")
            }
        }
    }
}

@Composable
private fun EmailStep(viewModel: ForgotPasswordViewModel) {
    Hint("E-posta adresinize 6 haneli bir doğrulama kodu göndereceğiz.")
    TextInput(
        value = viewModel.email,
        onValueChange = { viewModel.email = it },
        label = "E-posta",
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Send),
    )
    viewModel.error?.let { FormError(it) }
    SubmitButton("Kod gönder", viewModel.email.isNotBlank() && !viewModel.isLoading, viewModel.isLoading, viewModel::sendCode)
}

@Composable
private fun CodeStep(viewModel: ForgotPasswordViewModel) {
    Hint("${viewModel.email} sistemde kayıtlıysa bir kod gönderildi. Kod 15 dakika geçerli.")
    TextInput(
        value = viewModel.code,
        onValueChange = viewModel::onCodeChange,
        label = "Doğrulama kodu",
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Next),
    )
    PasswordField(viewModel.newPassword, { viewModel.newPassword = it }, "Yeni şifre")
    PasswordField(viewModel.repeatPassword, { viewModel.repeatPassword = it }, "Yeni şifre (tekrar)")
    PasswordChecklist(viewModel.newPassword, viewModel.passwordsMatch)
    viewModel.error?.let { FormError(it) }
    SubmitButton("Şifreyi değiştir", viewModel.canReset, viewModel.isLoading, viewModel::resetPassword)
    TextButton(onClick = viewModel::sendCode, enabled = !viewModel.isLoading) {
        Text("Kodu tekrar gönder")
    }
}

@Composable
private fun DoneStep(onBack: () -> Unit) {
    Pill("Şifreniz güncellendi", LocalTones.current.good)
    Hint("Yeni şifrenizle giriş yapabilirsiniz. Diğer cihazlardaki oturumlarınız kapatıldı.")
    SubmitButton("Girişe dön", enabled = true, loading = false, onClick = onBack)
}

@Composable
private fun Hint(text: String) {
    Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun SubmitButton(text: String, enabled: Boolean, loading: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp),
    ) {
        if (loading) {
            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
        } else {
            Text(text, fontWeight = FontWeight.SemiBold)
        }
    }
}
