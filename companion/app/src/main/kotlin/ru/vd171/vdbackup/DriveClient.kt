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

import android.content.Context
import com.google.android.gms.auth.GoogleAuthUtil
import com.google.android.gms.auth.UserRecoverableAuthException
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class DriveClient(private val context: Context) {

    class DriveException(val code: String, message: String) : Exception(message)

    private class Unauthorized : Exception()

    private var lastToken: String? = null
    private val folderCache = HashMap<String, String>()   // path -> Drive folder id (per instance)

    private fun token(force: Boolean): String {
        val account = TokenStore.account(context)
            ?: throw DriveException("ERR_NO_CONSENT", "no linked account")
        try {
            if (force) lastToken?.let { GoogleAuthUtil.clearToken(context, it) }
            val fresh = GoogleAuthUtil.getToken(context, account, DriveConfig.AUTH_TOKEN_SCOPE)
            lastToken = fresh
            return fresh
        } catch (e: UserRecoverableAuthException) {
            throw DriveException("ERR_CONSENT_REQUIRED", "consent required or revoked")
        } catch (e: DriveException) {
            throw e
        } catch (e: Exception) {
            throw DriveException("ERR_TOKEN", e.message ?: "token error")
        }
    }

    private fun <T> authorized(block: (String) -> T): T {
        val first = token(false)
        return try {
            block(first)
        } catch (e: Unauthorized) {
            val second = token(true)
            try {
                block(second)
            } catch (e2: Unauthorized) {
                throw DriveException("ERR_CONSENT_REQUIRED", "token rejected after refresh")
            }
        }
    }

    fun checkConsent(): Boolean =
        try {
            token(false)
            true
        } catch (e: DriveException) {
            false
        }

    fun list(name: String?): String {
        val q = if (name.isNullOrEmpty()) "trashed=false"
                else "name='${driveQuote(name)}' and trashed=false"
        val fields = "nextPageToken,incompleteSearch,files(id,name,size,mimeType,modifiedTime)"
        val url = "${DriveConfig.FILES_ENDPOINT}?spaces=drive&pageSize=1000" +
            "&q=${enc(q)}&fields=${enc(fields)}"
        return authorized { tok ->
            val conn = open(url, "GET", tok)
            readBody(conn, "ERR_LIST")
        }
    }

    fun delete(fileId: String): String {
        if (fileId.isEmpty()) throw DriveException("ERR_DELETE", "missing file id")
        return authorized { tok ->
            val conn = open("${DriveConfig.FILES_ENDPOINT}/$fileId", "DELETE", tok)
            val code = conn.responseCode
            if (code == 401) {
                conn.disconnect()
                throw Unauthorized()
            }
            val body = if (code in 200..299) "" else errorText(conn)
            conn.disconnect()
            if (code !in 200..299) throw DriveException("ERR_DELETE", "http $code: $body")
            "{\"deleted\":\"${jsonStr(fileId)}\"}"
        }
    }

    fun download(fileId: String, localPath: String): String {
        if (fileId.isEmpty()) throw DriveException("ERR_DOWNLOAD", "missing file id")
        if (localPath.isEmpty()) throw DriveException("ERR_DOWNLOAD", "missing destination")
        return authorized { tok ->
            val conn = open("${DriveConfig.FILES_ENDPOINT}/$fileId?alt=media", "GET", tok)
            val code = conn.responseCode
            if (code == 401) {
                conn.disconnect()
                throw Unauthorized()
            }
            if (code !in 200..299) {
                val body = errorText(conn)
                conn.disconnect()
                throw DriveException("ERR_DOWNLOAD", "http $code: $body")
            }
            val out = File(localPath)
            out.parentFile?.mkdirs()
            FileOutputStream(out).use { sink -> conn.inputStream.use { it.copyTo(sink) } }
            conn.disconnect()
            "{\"saved\":\"${jsonStr(localPath)}\",\"id\":\"${jsonStr(fileId)}\"}"
        }
    }

    fun upload(localPath: String, remoteName: String): String {
        val file = File(localPath)
        if (!file.isFile) throw DriveException("ERR_SRC", "missing $localPath")
        val slash = remoteName.lastIndexOf('/')
        val parentPath = if (slash >= 0) remoteName.substring(0, slash) else ""
        val fileName = if (slash >= 0) remoteName.substring(slash + 1) else remoteName
        return authorized { tok ->
            val parentId = folderId(parentPath, tok)   // real Drive folders, not a slashy name
            resumableUpload(file, fileName, parentId, tok)
        }
    }

    // resolve (creating as needed) the nested folder path to its leaf folder id.
    // Uses the drive.file scope, so it only ever sees/creates folders this app made.
    private fun folderId(path: String, token: String): String? {
        if (path.isEmpty()) return null
        var parent: String? = null
        var acc = ""
        for (seg in path.split("/")) {
            if (seg.isEmpty()) continue
            acc = if (acc.isEmpty()) seg else "$acc/$seg"
            val cached = folderCache[acc]
            if (cached != null) { parent = cached; continue }
            val id = findOrCreateFolder(seg, parent, token)
            folderCache[acc] = id
            parent = id
        }
        return parent
    }

    private fun findOrCreateFolder(name: String, parent: String?, token: String): String {
        var q = "name = '${driveQuote(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
        q += if (parent != null) " and '${driveQuote(parent)}' in parents" else ""
        val findUrl = "${DriveConfig.FILES_ENDPOINT}?q=${enc(q)}&fields=${enc("files(id)")}&pageSize=1"
        val found = readBody(open(findUrl, "GET", token), "ERR_UPLOAD")
        Regex("\"id\"\\s*:\\s*\"([^\"]+)\"").find(found)?.let { return it.groupValues[1] }
        val meta = StringBuilder("{\"name\":\"${jsonStr(name)}\",\"mimeType\":\"application/vnd.google-apps.folder\"")
        if (parent != null) meta.append(",\"parents\":[\"${jsonStr(parent)}\"]")
        meta.append("}")
        val conn = open("${DriveConfig.FILES_ENDPOINT}?fields=${enc("id")}", "POST", token)
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        conn.outputStream.use { it.write(meta.toString().toByteArray(Charsets.UTF_8)) }
        val body = readBody(conn, "ERR_UPLOAD")
        return Regex("\"id\"\\s*:\\s*\"([^\"]+)\"").find(body)?.groupValues?.get(1)
            ?: throw DriveException("ERR_UPLOAD", "could not create folder $name")
    }

    private fun resumableUpload(file: File, name: String, parentId: String?, token: String): String {
        val total = file.length()
        val sessionUrl = initiateResumable(name, parentId, total, token)
        var offset = 0L
        RandomAccessFile(file, "r").use { raf ->
            while (true) {
                val remaining = total - offset
                val size = if (remaining > CHUNK_SIZE) CHUNK_SIZE else remaining
                val buffer = ByteArray(size.toInt())
                if (size > 0) {
                    raf.seek(offset)
                    raf.readFully(buffer)
                }
                val conn = openSession(sessionUrl)
                conn.setFixedLengthStreamingMode(size)
                val range = if (total == 0L) "bytes */0"
                    else "bytes $offset-${offset + size - 1}/$total"
                conn.setRequestProperty("Content-Range", range)
                conn.outputStream.use { it.write(buffer) }
                val code = conn.responseCode
                when {
                    code == 401 -> {
                        conn.disconnect()
                        throw Unauthorized()
                    }
                    code == 308 -> {
                        offset = confirmedOffset(conn, offset + size)
                        conn.disconnect()
                    }
                    code in 200..299 -> {
                        val body = conn.inputStream.bufferedReader().use { it.readText() }
                        conn.disconnect()
                        return body
                    }
                    else -> {
                        val body = errorText(conn)
                        conn.disconnect()
                        throw DriveException("ERR_UPLOAD", "http $code: $body")
                    }
                }
            }
        }
        throw DriveException("ERR_UPLOAD", "upload did not finalize")
    }

    private fun initiateResumable(name: String, parentId: String?, total: Long, token: String): String {
        val url = "${DriveConfig.UPLOAD_ENDPOINT}?uploadType=resumable&fields=${enc("id,name,size,mimeType")}"
        val conn = open(url, "POST", token)
        conn.doOutput = true
        conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
        conn.setRequestProperty("X-Upload-Content-Type", "application/octet-stream")
        if (total > 0) conn.setRequestProperty("X-Upload-Content-Length", total.toString())
        val meta = StringBuilder("{\"name\":\"${jsonStr(name)}\"")
        if (parentId != null) meta.append(",\"parents\":[\"${jsonStr(parentId)}\"]")
        meta.append("}")
        conn.outputStream.use { it.write(meta.toString().toByteArray(Charsets.UTF_8)) }
        val code = conn.responseCode
        if (code == 401) {
            conn.disconnect()
            throw Unauthorized()
        }
        if (code !in 200..299) {
            val body = errorText(conn)
            conn.disconnect()
            throw DriveException("ERR_UPLOAD", "http $code: $body")
        }
        val location = conn.getHeaderField("Location")
        conn.disconnect()
        return location ?: throw DriveException("ERR_UPLOAD", "no resumable session url")
    }

    private fun confirmedOffset(conn: HttpURLConnection, fallback: Long): Long {
        val range = conn.getHeaderField("Range") ?: return fallback
        val dash = range.lastIndexOf('-')
        if (dash < 0) return fallback
        val end = range.substring(dash + 1).toLongOrNull() ?: return fallback
        return end + 1
    }

    private fun open(urlStr: String, method: String, token: String): HttpURLConnection {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.connectTimeout = CONNECT_TIMEOUT
        conn.readTimeout = READ_TIMEOUT
        conn.setRequestProperty("Authorization", "Bearer $token")
        return conn
    }

    private fun openSession(sessionUrl: String): HttpURLConnection {
        val conn = URL(sessionUrl).openConnection() as HttpURLConnection
        conn.requestMethod = "PUT"
        conn.connectTimeout = CONNECT_TIMEOUT
        conn.readTimeout = UPLOAD_TIMEOUT
        conn.doOutput = true
        return conn
    }

    private fun readBody(conn: HttpURLConnection, errCode: String): String {
        val code = conn.responseCode
        if (code == 401) {
            conn.disconnect()
            throw Unauthorized()
        }
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val body = stream?.bufferedReader()?.use { it.readText() } ?: ""
        conn.disconnect()
        if (code !in 200..299) throw DriveException(errCode, "http $code: $body")
        return body
    }

    private fun errorText(conn: HttpURLConnection): String =
        conn.errorStream?.bufferedReader()?.use { it.readText() } ?: ""

    private fun enc(s: String): String = URLEncoder.encode(s, "UTF-8")

    private fun driveQuote(s: String): String = s.replace("\\", "\\\\").replace("'", "\\'")

    private fun jsonStr(s: String): String = s.replace("\\", "\\\\").replace("\"", "\\\"")

    companion object {
        private const val CHUNK_SIZE = 8L * 1024 * 1024
        private const val CONNECT_TIMEOUT = 30000
        private const val READ_TIMEOUT = 60000
        private const val UPLOAD_TIMEOUT = 120000
    }
}
