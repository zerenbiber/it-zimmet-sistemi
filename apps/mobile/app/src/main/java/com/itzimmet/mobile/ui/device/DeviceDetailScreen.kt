package com.itzimmet.mobile.ui.device

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.itzimmet.mobile.data.remote.Device
import com.itzimmet.mobile.data.remote.DeviceEvent
import com.itzimmet.mobile.ui.UiState
import com.itzimmet.mobile.ui.components.DeviceTypeBadge
import com.itzimmet.mobile.ui.components.ErrorBox
import com.itzimmet.mobile.ui.components.InfoRow
import com.itzimmet.mobile.ui.components.LoadingBox
import com.itzimmet.mobile.ui.components.SectionCard
import com.itzimmet.mobile.ui.components.SectionTitle
import com.itzimmet.mobile.ui.components.StatusPill
import com.itzimmet.mobile.ui.theme.LocalTones
import com.itzimmet.mobile.util.daysUntil
import com.itzimmet.mobile.util.deviceEventLabel
import com.itzimmet.mobile.util.deviceTypeLabel
import com.itzimmet.mobile.util.formatCalendarDate
import com.itzimmet.mobile.util.formatDate
import com.itzimmet.mobile.util.formatDateTime

/** Gösterge panelindeki gibi: garantisi 30 gün içinde bitecek cihazlar uyarılır. */
private const val WARRANTY_WARNING_DAYS = 30

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeviceDetailScreen(
    onBack: () -> Unit,
    viewModel: DeviceDetailViewModel = viewModel(factory = DeviceDetailViewModel.Factory),
) {
    val state = viewModel.state
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text((state as? UiState.Success)?.data?.assetTag ?: "Cihaz") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Geri")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        val modifier = Modifier.padding(padding)
        when (state) {
            UiState.Loading -> LoadingBox(modifier)
            is UiState.Error -> ErrorBox(state.message, onRetry = viewModel::load, modifier = modifier)
            is UiState.Success -> DeviceContent(state.data, modifier)
        }
    }
}

@Composable
private fun DeviceContent(device: Device, modifier: Modifier = Modifier) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .wrapContentWidth()
            .widthIn(max = 720.dp),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { HeaderCard(device) }
        item { WarrantyWarning(device) }
        item { AssignmentCard(device) }
        item { InfoCard(device) }
        if (device.events.isNotEmpty()) {
            item { SectionTitle("Geçmiş", Modifier.padding(top = 8.dp)) }
            item {
                SectionCard {
                    device.events.forEachIndexed { index, event ->
                        EventRow(event, isLast = index == device.events.lastIndex)
                    }
                }
            }
        }
    }
}

@Composable
private fun HeaderCard(device: Device) {
    SectionCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            DeviceTypeBadge(device.type)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("${device.brand} ${device.model}", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                Text(
                    deviceTypeLabel(device.type),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        StatusPill(device.status)
    }
}

@Composable
private fun WarrantyWarning(device: Device) {
    val days = device.warrantyEndDate?.let(::daysUntil) ?: return
    if (days > WARRANTY_WARNING_DAYS || device.status == "RETIRED") return

    val tone = if (days < 0) LocalTones.current.critical else LocalTones.current.warning
    val text = when {
        days < 0 -> "Garantisi ${-days} gün önce bitti."
        days == 0L -> "Garantisi bugün bitiyor."
        else -> "Garantisi $days gün içinde bitiyor."
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(tone.soft)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Outlined.WarningAmber, contentDescription = null, tint = tone.text, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(8.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = tone.text, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun AssignmentCard(device: Device) {
    SectionCard {
        SectionTitle("Zimmet")
        Spacer(Modifier.height(8.dp))
        val assignment = device.currentAssignment
        if (assignment == null) {
            Text(
                "Cihaz şu an kimseye zimmetli değil.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            return@SectionCard
        }
        val user = assignment.user
        Text(user.fullName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Text(user.email, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(8.dp))
        user.department?.let { InfoRow("Departman", it.name) }
        InfoRow("Teslim tarihi", formatDate(assignment.assignedAt))
    }
}

@Composable
private fun InfoCard(device: Device) {
    SectionCard {
        SectionTitle("Bilgiler")
        Spacer(Modifier.height(4.dp))
        InfoRow("Demirbaş no", device.assetTag)
        InfoRow("Seri no", device.serialNumber)
        InfoRow("Alım tarihi", formatCalendarDate(device.purchaseDate))
        InfoRow("Garanti bitişi", device.warrantyEndDate?.let(::formatCalendarDate) ?: "—")
        device.notes?.takeIf { it.isNotBlank() }?.let {
            Spacer(Modifier.height(8.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(Modifier.height(8.dp))
            Text(it, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

/** Zaman çizelgesi satırı: solda nokta ve bir sonraki olaya uzanan çizgi. */
@Composable
private fun EventRow(event: DeviceEvent, isLast: Boolean) {
    // IntrinsicSize.Min: çizgi, sağdaki metin ne kadar uzunsa o kadar uzar.
    Row(Modifier.height(IntrinsicSize.Min)) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .width(16.dp)
                .fillMaxHeight(),
        ) {
            Spacer(Modifier.height(6.dp))
            Box(
                Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primary),
            )
            if (!isLast) {
                Box(
                    Modifier
                        .width(1.dp)
                        .weight(1f)
                        .background(MaterialTheme.colorScheme.outlineVariant),
                )
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.padding(bottom = if (isLast) 0.dp else 12.dp)) {
            Text(deviceEventLabel(event.type), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            event.description?.takeIf { it.isNotBlank() }?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                listOfNotNull(formatDateTime(event.createdAt), event.performedBy?.fullName).joinToString(" · "),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.outline,
            )
        }
    }
}
