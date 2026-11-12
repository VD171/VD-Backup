/*
 * ======================================================================
 *  VD BACKUP  ::  root backup & restore, no grant prompt
 *  Full app/data backup & restore as root - KernelSU/APatch/Magisk WebUI.
 *
 *  Copyright (C) 2026  VD171
 *  SPDX-License-Identifier: AGPL-3.0-or-later
 *
 *  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
 *  modified version, even as a service, and you MUST offer its source.
 *
 *  Site           : https://vd171.ru
 *  Site           : https://vd.priv8.ru
 *  Source         : https://github.com/VD171/VD-Backup
 *  GitHub         : @VD171 https://github.com/VD171
 *  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
 *  XDA thread     : https://xdaforums.com/t/VD-Backup.4807267/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Channel        : @Priv8_VD https://t.me/Priv8_VD
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 */
package ru.vd171.vdbackup

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

class DriveCommandService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        promoteForeground()
        if (intent == null) {
            stopSelfResult(startId)
            return START_NOT_STICKY
        }
        val op = intent.getStringExtra("op") ?: ""
        val src = intent.getStringExtra("src")
        val dst = intent.getStringExtra("dst")
        val id = intent.getStringExtra("id")
        val name = intent.getStringExtra("name")
        val result = intent.getStringExtra("result")
        Thread {
            runOp(op, src, dst, id, name, result)
            stopForegroundCompat()
            stopSelfResult(startId)
        }.start()
        return START_NOT_STICKY
    }

    private fun runOp(op: String, src: String?, dst: String?, id: String?, name: String?, result: String?) {
        val client = DriveClient(this)
        try {
            when (op) {
                "check" -> {
                    val ok = client.checkConsent()
                    emit(result, ok, op, if (ok) "ERR_NONE" else "ERR_NO_CONSENT", null, "consent status")
                }
                "list" -> emit(result, true, op, "ERR_NONE", client.list(name), "list ok")
                "upload" -> {
                    val source = src ?: ""
                    val remote = if (!name.isNullOrEmpty()) name else source.substringAfterLast('/')
                    emit(result, true, op, "ERR_NONE", client.upload(source, remote), "upload ok")
                }
                "download" -> emit(result, true, op, "ERR_NONE", client.download(id ?: "", dst ?: ""), "download ok")
                "delete" -> emit(result, true, op, "ERR_NONE", client.delete(id ?: ""), "delete ok")
                else -> emit(result, false, op, "ERR_UNKNOWN_OP", null, "unknown op")
            }
        } catch (e: DriveClient.DriveException) {
            emit(result, false, op, e.code, null, e.message)
        } catch (e: Exception) {
            emit(result, false, op, "ERR_INTERNAL", null, e.message)
        }
    }

    private fun emit(result: String?, ok: Boolean, op: String, code: String, data: String?, message: String?) {
        result?.let { CommandResult.write(it, ok, op, code, data, message) }
    }

    private fun promoteForeground() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "VDBackup Drive", NotificationManager.IMPORTANCE_MIN)
            )
        }
        val notification: Notification = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.companion_service_label))
            .setSmallIcon(android.R.drawable.stat_sys_upload)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun stopForegroundCompat() {
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    companion object {
        private const val CHANNEL_ID = "vdbackup_companion"
        private const val NOTIFICATION_ID = 1
    }
}
