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
 *  XDA-Thread     : https://xdaforums.com/t/VD-Backup.4807267/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Telegram       : @Priv8_VD https://t.me/Priv8_VD
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 */
package ru.vd171.vdbackup

import java.io.File

object CommandResult {

    fun write(path: String, ok: Boolean, op: String, code: String, data: String?, message: String?) {
        val sb = StringBuilder()
        sb.append("{\"ok\":").append(ok)
        sb.append(",\"op\":\"").append(esc(op)).append('"')
        sb.append(",\"code\":\"").append(esc(code)).append('"')
        if (data != null) sb.append(",\"data\":").append(data)
        if (message != null) sb.append(",\"message\":\"").append(esc(message)).append('"')
        sb.append('}')

        val out = File(path)
        out.parentFile?.mkdirs()
        val tmp = File("$path.tmp")
        tmp.writeText(sb.toString())
        tmp.renameTo(out)
        File("$path.done").writeText("")
    }

    private fun esc(s: String): String {
        val b = StringBuilder()
        for (c in s) {
            when (c) {
                '"' -> b.append("\\\"")
                '\\' -> b.append("\\\\")
                '\n' -> b.append("\\n")
                '\r' -> b.append("\\r")
                '\t' -> b.append("\\t")
                else -> if (c.code < 0x20) b.append("\\u%04x".format(c.code)) else b.append(c)
            }
        }
        return b.toString()
    }
}
