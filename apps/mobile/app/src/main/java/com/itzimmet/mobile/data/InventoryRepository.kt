package com.itzimmet.mobile.data

import com.itzimmet.mobile.data.remote.Assignment
import com.itzimmet.mobile.data.remote.Device
import com.itzimmet.mobile.data.remote.ZimmetApi

class InventoryRepository(private val api: ZimmetApi) {

    suspend fun myAssignments(userId: String): List<Assignment> = api.assignments(userId).items

    /** QR kodun içinde sadece demirbaş numarası var (ör. IT-2026-00042). */
    suspend fun findByAssetTag(assetTag: String): Device = api.deviceByTag(assetTag.trim().uppercase())

    suspend fun device(id: String): Device = api.device(id)
}
