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

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.Scope

class ConsentActivity : Activity() {

    private lateinit var client: GoogleSignInClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val options = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()
            .requestScopes(Scope(DriveConfig.SCOPE))
            .requestIdToken(getString(R.string.oauth_client_id))
            .build()
        client = GoogleSignIn.getClient(this, options)

        val existing = GoogleSignIn.getLastSignedInAccount(this)
        if (existing != null && GoogleSignIn.hasPermissions(existing, Scope(DriveConfig.SCOPE))) {
            TokenStore.saveAccount(this, existing.account?.name)
            finishWith(true, "ERR_NONE")
        } else {
            startActivityForResult(client.signInIntent, RC_SIGN_IN)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != RC_SIGN_IN) return
        try {
            val account = GoogleSignIn.getSignedInAccountFromIntent(data).getResult(ApiException::class.java)
            if (!GoogleSignIn.hasPermissions(account, Scope(DriveConfig.SCOPE))) {
                finishWith(false, "ERR_CONSENT_DENIED", "Drive permission not granted (tick the Drive checkbox on the consent screen)")
                return
            }
            TokenStore.saveAccount(this, account.account?.name)
            finishWith(true, "ERR_NONE")
        } catch (e: ApiException) {
            finishWith(false, "ERR_CONSENT_DENIED", "sign-in failed (status=" + e.statusCode + ")")
        }
    }

    private fun finishWith(ok: Boolean, code: String, msg: String? = null) {
        intent.getStringExtra(EXTRA_RESULT)?.let { path ->
            CommandResult.write(path, ok, "consent", code, null, msg ?: if (ok) "consent granted" else "consent denied")
        }
        setResult(if (ok) RESULT_OK else RESULT_CANCELED)
        finish()
    }

    companion object {
        private const val RC_SIGN_IN = 0x7D1
        const val EXTRA_RESULT = "result"
    }
}
