package com.itzimmet.mobile

import android.app.Application

class ZimmetApplication : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
