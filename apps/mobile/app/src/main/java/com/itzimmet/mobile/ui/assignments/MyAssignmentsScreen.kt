package com.itzimmet.mobile.ui.assignments

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.itzimmet.mobile.data.remote.Assignment
import com.itzimmet.mobile.ui.UiState
import com.itzimmet.mobile.ui.components.DeviceTypeBadge
import com.itzimmet.mobile.ui.components.ErrorBox
import com.itzimmet.mobile.ui.components.LoadingBox
import com.itzimmet.mobile.ui.components.MessageBox
import com.itzimmet.mobile.ui.components.Pill
import com.itzimmet.mobile.ui.components.SectionCard
import com.itzimmet.mobile.ui.components.SectionTitle
import com.itzimmet.mobile.ui.theme.LocalTones
import com.itzimmet.mobile.util.deviceTypeLabel
import com.itzimmet.mobile.util.formatDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyAssignmentsScreen(
    userId: String,
    modifier: Modifier = Modifier,
    viewModel: MyAssignmentsViewModel = viewModel(factory = MyAssignmentsViewModel.factory(userId)),
) {
    when (val state = viewModel.state) {
        UiState.Loading -> LoadingBox(modifier)
        is UiState.Error -> ErrorBox(state.message, onRetry = viewModel::load, modifier = modifier)
        is UiState.Success -> PullToRefreshBox(
            isRefreshing = viewModel.isRefreshing,
            onRefresh = viewModel::refresh,
            modifier = modifier.fillMaxSize(),
        ) {
            AssignmentList(state.data)
        }
    }
}

@Composable
private fun AssignmentList(assignments: List<Assignment>) {
    val (active, past) = assignments.partition { it.isActive }

    if (assignments.isEmpty()) {
        // PullToRefreshBox içinde kaydırılabilir bir alan olsun diye LazyColumn.
        LazyColumn(Modifier.fillMaxSize()) {
            item {
                MessageBox(
                    icon = Icons.Outlined.Inventory2,
                    title = "Üzerinize zimmetli cihaz yok",
                    message = "Size bir cihaz zimmetlendiğinde burada görünecek.",
                    modifier = Modifier.padding(top = 80.dp),
                )
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .wrapContentWidth()
            .widthIn(max = 720.dp),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { SectionTitle("Üzerimdeki cihazlar (${active.size})") }
        if (active.isEmpty()) {
            item {
                Text(
                    "Şu an üzerinizde cihaz yok.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        items(active, key = { it.id }) { AssignmentCard(it) }

        if (past.isNotEmpty()) {
            item { SectionTitle("Geçmiş zimmetler (${past.size})", Modifier.padding(top = 12.dp)) }
            items(past, key = { it.id }) { AssignmentCard(it) }
        }
    }
}

@Composable
private fun AssignmentCard(assignment: Assignment) {
    val device = assignment.device
    val tones = LocalTones.current

    SectionCard(Modifier.alpha(if (assignment.isActive) 1f else 0.75f)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            DeviceTypeBadge(device.type)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text("${device.brand} ${device.model}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    "${deviceTypeLabel(device.type)} · ${device.assetTag}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (assignment.isActive) Pill("Üzerimde", tones.info) else Pill("İade edildi", tones.neutral)
        }

        Spacer(Modifier.height(12.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        Spacer(Modifier.height(10.dp))

        Detail("Seri no", device.serialNumber)
        Detail("Teslim tarihi", formatDate(assignment.assignedAt))
        assignment.returnedAt?.let { Detail("İade tarihi", formatDate(it)) }
        Detail("Teslim eden", assignment.assignedBy.fullName)
        assignment.assignNote?.takeIf { it.isNotBlank() }?.let { Detail("Not", it) }
    }
}

@Composable
private fun Detail(label: String, value: String) {
    Row(Modifier.padding(vertical = 2.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(96.dp),
        )
        Text(value, style = MaterialTheme.typography.bodySmall)
    }
}
