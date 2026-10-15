package com.itzimmet.mobile.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.itzimmet.mobile.data.AuthRepository
import com.itzimmet.mobile.data.SessionState
import com.itzimmet.mobile.data.remote.CurrentUser
import com.itzimmet.mobile.ui.device.DeviceDetailScreen
import com.itzimmet.mobile.ui.home.HomeScreen
import com.itzimmet.mobile.ui.login.AppLogo
import com.itzimmet.mobile.ui.login.LoginScreen
import com.itzimmet.mobile.ui.navigation.DeviceDetailRoute
import com.itzimmet.mobile.ui.navigation.HomeRoute
import com.itzimmet.mobile.ui.password.ChangePasswordScreen
import com.itzimmet.mobile.ui.password.ForgotPasswordScreen
import com.itzimmet.mobile.ui.password.ForgotPasswordViewModel
import kotlinx.coroutines.launch

class MainViewModel(private val authRepository: AuthRepository) : ViewModel() {

    val session = authRepository.session

    init {
        viewModelScope.launch { authRepository.restoreSession() }
    }

    fun logout() {
        viewModelScope.launch { authRepository.logout() }
    }

    companion object {
        val Factory = viewModelFactory {
            initializer { MainViewModel(container.authRepository) }
        }
    }
}

/**
 * Hangi ekranın açılacağına oturum durumu karar verir. Giriş yapılınca ya da
 * oturum düşünce ekran kendiliğinden değişir, elle yönlendirme gerekmez.
 */
@Composable
fun AppRoot(viewModel: MainViewModel = viewModel(factory = MainViewModel.Factory)) {
    val session by viewModel.session.collectAsStateWithLifecycle()

    when (val state = session) {
        SessionState.Loading -> SplashScreen()
        SessionState.LoggedOut -> LoggedOutContent()
        is SessionState.LoggedIn ->
            if (state.user.mustChangePassword) ChangePasswordScreen()
            else MainNavHost(state.user, onLogout = viewModel::logout)
    }
}

/** Giriş yapılmamışken iki ekran var: giriş ve şifremi unuttum. Ayrı bir NavHost'a gerek yok. */
@Composable
private fun LoggedOutContent() {
    var showForgot by rememberSaveable { mutableStateOf(false) }
    // Her açılışta yeni ViewModel: önceki denemenin adımı ve yazılanlar kalmasın.
    var forgotVisit by rememberSaveable { mutableIntStateOf(0) }

    if (showForgot) {
        ForgotPasswordScreen(
            onBack = { showForgot = false },
            viewModel = viewModel(key = "forgot-$forgotVisit", factory = ForgotPasswordViewModel.Factory),
        )
    } else {
        LoginScreen(onForgotPassword = {
            forgotVisit++
            showForgot = true
        })
    }
}

@Composable
private fun MainNavHost(user: CurrentUser, onLogout: () -> Unit) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = HomeRoute) {
        composable<HomeRoute> {
            HomeScreen(
                user = user,
                onOpenDevice = { id -> navController.navigate(DeviceDetailRoute(id)) },
                onLogout = onLogout,
            )
        }
        composable<DeviceDetailRoute> {
            DeviceDetailScreen(onBack = { navController.popBackStack() })
        }
    }
}

@Composable
private fun SplashScreen() {
    Box(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        AppLogo()
    }
}
