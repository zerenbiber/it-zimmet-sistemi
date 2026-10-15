package com.itzimmet.mobile.ui.scan

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.mlkit.vision.MlKitAnalyzer
import androidx.camera.view.LifecycleCameraController
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.NoPhotography
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.itzimmet.mobile.ui.components.FormError
import com.itzimmet.mobile.ui.components.MessageBox
import com.itzimmet.mobile.ui.components.TextInput

/** Admin ekranı: cihazın QR etiketini okutup bilgilerine ulaşma. */
@Composable
fun ScanScreen(
    onDeviceFound: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ScanViewModel = viewModel(factory = ScanViewModel.Factory),
) {
    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
    }
    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        hasPermission = it
    }
    LaunchedEffect(Unit) {
        if (!hasPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    LaunchedEffect(viewModel.foundDeviceId) {
        viewModel.foundDeviceId?.let {
            viewModel.consumeResult()
            onDeviceFound(it)
        }
    }

    Column(
        // Kamera alanı kare; tablette ekrandan taşmasın diye genişlik sınırlı.
        modifier = modifier
            .fillMaxSize()
            .wrapContentWidth()
            .widthIn(max = 480.dp)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(20.dp))
                .background(Color(0xFF0D111C)),
            contentAlignment = Alignment.Center,
        ) {
            if (hasPermission) {
                CameraPreview(onCode = viewModel::onCodeScanned, modifier = Modifier.fillMaxSize())
                ScanFrame(Modifier.fillMaxSize())
            } else {
                MessageBox(
                    icon = Icons.Outlined.NoPhotography,
                    title = "Kamera izni gerekli",
                    message = "QR okutmak için kameraya izin verin. Demirbaş numarasını aşağıya elle de yazabilirsiniz.",
                    action = {
                        FilledTonalButton(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) }) {
                            Text("İzin ver")
                        }
                    },
                )
            }
            if (viewModel.isLoading) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.45f)),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = Color.White)
                }
            }
        }

        Text(
            "Cihazın üzerindeki QR etiketini çerçevenin içine tutun.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        viewModel.error?.let { FormError(it) }

        Row(verticalAlignment = Alignment.CenterVertically) {
            HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
            Text(
                "ya da",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.outline,
                modifier = Modifier.padding(horizontal = 12.dp),
            )
            HorizontalDivider(Modifier.weight(1f), color = MaterialTheme.colorScheme.outlineVariant)
        }

        TextInput(
            value = viewModel.manualTag,
            onValueChange = { viewModel.manualTag = it },
            label = "Demirbaş no (ör. IT-2026-00042)",
            keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { viewModel.searchManual() }),
        )
        Button(
            onClick = viewModel::searchManual,
            enabled = viewModel.manualTag.isNotBlank() && !viewModel.isLoading,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp),
        ) {
            Text("Cihazı bul")
        }
        Spacer(Modifier.height(8.dp))
    }
}

/**
 * CameraX önizlemesi. Her kare ML Kit'e gönderilir, QR kod bulunursa içindeki
 * metin (demirbaş numarası) onCode ile dışarı verilir.
 */
@Composable
private fun CameraPreview(onCode: (String) -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnCode by rememberUpdatedState(onCode)
    val controller = remember {
        LifecycleCameraController(context).apply { cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA }
    }

    DisposableEffect(lifecycleOwner) {
        val scanner = BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build(),
        )
        val executor = ContextCompat.getMainExecutor(context)
        controller.setImageAnalysisAnalyzer(
            executor,
            MlKitAnalyzer(listOf(scanner), ImageAnalysis.COORDINATE_SYSTEM_ORIGINAL, executor) { result ->
                result.getValue(scanner)?.firstNotNullOfOrNull { it.rawValue }?.let(currentOnCode)
            },
        )
        controller.bindToLifecycle(lifecycleOwner)

        onDispose {
            controller.unbind()
            scanner.close()
        }
    }

    AndroidView(
        factory = { PreviewView(it).apply { this.controller = controller } },
        modifier = modifier,
    )
}

/** Önizlemenin ortasındaki köşe çizgileri. */
@Composable
private fun ScanFrame(modifier: Modifier = Modifier) {
    Canvas(modifier.padding(56.dp)) {
        val corner = size.minDimension * 0.18f
        val stroke = 4.dp.toPx()
        val w = size.width
        val h = size.height
        val lines = listOf(
            Offset(0f, corner) to Offset(0f, 0f), Offset(0f, 0f) to Offset(corner, 0f),
            Offset(w - corner, 0f) to Offset(w, 0f), Offset(w, 0f) to Offset(w, corner),
            Offset(0f, h - corner) to Offset(0f, h), Offset(0f, h) to Offset(corner, h),
            Offset(w - corner, h) to Offset(w, h), Offset(w, h - corner) to Offset(w, h),
        )
        lines.forEach { (start, end) -> drawLine(Color.White, start, end, stroke, StrokeCap.Round) }
    }
}
