package com.itzimmet.mobile.ui.home

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.QrCodeScanner
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.layout.padding
import com.itzimmet.mobile.data.remote.CurrentUser
import com.itzimmet.mobile.ui.assignments.MyAssignmentsScreen
import com.itzimmet.mobile.ui.profile.ProfileScreen
import com.itzimmet.mobile.ui.scan.ScanScreen

enum class HomeTab(val label: String, val title: String, val icon: ImageVector) {
    SCAN("QR Okut", "Cihaz bul", Icons.Outlined.QrCodeScanner),
    ASSIGNMENTS("Zimmetlerim", "Zimmetlerim", Icons.Outlined.Inventory2),
    PROFILE("Profil", "Profil", Icons.Outlined.Person),
}

/** Alt menülü ana ekran. Cihaz uç noktaları sadece admin'e açık olduğu için QR sekmesini personel görmez. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(user: CurrentUser, onOpenDevice: (String) -> Unit, onLogout: () -> Unit) {
    val tabs = if (user.isAdmin) HomeTab.entries else listOf(HomeTab.ASSIGNMENTS, HomeTab.PROFILE)
    var selected by rememberSaveable { mutableStateOf(tabs.first()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(selected.title, fontWeight = FontWeight.SemiBold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest) {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = tab == selected,
                        onClick = { selected = tab },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { padding ->
        val modifier = Modifier.padding(padding)
        when (selected) {
            HomeTab.SCAN -> ScanScreen(onDeviceFound = onOpenDevice, modifier = modifier)
            HomeTab.ASSIGNMENTS -> MyAssignmentsScreen(userId = user.id, modifier = modifier)
            HomeTab.PROFILE -> ProfileScreen(user = user, onLogout = onLogout, modifier = modifier)
        }
    }
}
