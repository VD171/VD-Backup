#!/usr/bin/env python3
# ======================================================================
#  VD BACKUP  ::  root backup & restore, no grant prompt
#  Telegram MTProto Client & Storage Engine
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
# ======================================================================

import sys
import os
import json
import time
import asyncio
import secrets
import argparse
import hashlib
import warnings
import re
from datetime import datetime, timezone

warnings.filterwarnings("ignore")

# Ensure vendored libraries in module/scripts/lib are importable
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LIB_DIR = os.path.join(SCRIPT_DIR, "lib")
if os.path.isdir(LIB_DIR) and LIB_DIR not in sys.path:
    sys.path.insert(0, LIB_DIR)

try:
    from telethon import TelegramClient
    from telethon.tl.functions.channels import CreateChannelRequest
    from telethon.tl.types import InputPeerChannel
    from telethon.errors import (
        SessionPasswordNeededError,
        PhoneCodeInvalidError,
        PhoneCodeExpiredError,
        PasswordHashInvalidError
    )
except ImportError as e:
    print(json.dumps({"ok": False, "code": "ERR_NO_TELETHON", "message": f"Telethon import failed: {e}"}))
    sys.exit(1)

# Built-in official Telegram application credentials (no client secrets needed from user)
API_ID = 2040
API_HASH = "b18441a1ff607e10a989891a5462e627"
DEVICE_MODEL = "Desktop"
SYSTEM_VERSION = "Windows 10"
APP_VERSION = "5.0.1 x64"

STATE_DIR = os.environ.get("VDBACKUP_STATE", "/data/adb/vdbackup")
CREDS_DIR = os.path.join(STATE_DIR, "creds")
DESTS_DIR = os.path.join(STATE_DIR, "dests")
STAGING_DIR = os.path.join(STATE_DIR, "staging")
LOGS_DIR = os.path.join(STATE_DIR, "logs")

SESSION_PATH = os.path.join(CREDS_DIR, "session")
AUTH_STATE_FILE = os.path.join(STAGING_DIR, "tg_auth.json")
DEST_FILE = os.path.join(DESTS_DIR, "telegram.json")
INDEX_CACHE_FILE = os.path.join(STATE_DIR, "telegram_index.json")

def ensure_dirs():
    for d in [CREDS_DIR, DESTS_DIR, STAGING_DIR, LOGS_DIR]:
        os.makedirs(d, mode=0o700, exist_ok=True)

def has_saved_session():
    return os.path.isfile(SESSION_PATH + ".session")

def create_client():
    ensure_dirs()
    return TelegramClient(
        SESSION_PATH,
        API_ID,
        API_HASH,
        device_model=DEVICE_MODEL,
        system_version=SYSTEM_VERSION,
        app_version=APP_VERSION
    )

def sha256_file(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def update_progress(opid, pct, phase, item=""):
    if not opid:
        return
    ensure_dirs()
    prog_file = os.path.join(LOGS_DIR, f"progress-{opid}.json")
    try:
        with open(prog_file, "w") as f:
            json.dump({
                "opid": opid,
                "percent": int(pct),
                "phase": phase,
                "item": item,
                "done": False
            }, f)
    except Exception:
        pass

def normalize_phone(phone):
    s = str(phone or "").strip()
    if s.startswith("00"):
        s = "+" + s[2:]
    digits = re.sub(r"\D", "", s)
    return "+" + digits if digits else ""

# --- Step 1: Send OTP to Phone ----------------------------------------
async def cmd_send_code(phone):
    ensure_dirs()
    phone = normalize_phone(phone)
    if not phone:
        print(json.dumps({"ok": False, "code": "ERR_INVALID_PHONE", "message": "Invalid phone number format"}))
        return

    # Clean previous session DB for a fresh login
    session_db = SESSION_PATH + ".session"
    if os.path.isfile(session_db):
        try:
            os.remove(session_db)
        except Exception:
            pass

    client = create_client()
    await client.connect()
    try:
        res = await client.send_code_request(phone)
        auth_data = {
            "phone": phone,
            "phone_code_hash": res.phone_code_hash,
            "timestamp": int(time.time())
        }
        with open(AUTH_STATE_FILE, "w") as f:
            json.dump(auth_data, f)
        os.chmod(AUTH_STATE_FILE, 0o600)

        print(json.dumps({
            "ok": True,
            "phone": phone,
            "phone_code_hash": res.phone_code_hash,
            "timeout": getattr(res, "timeout", 60)
        }))
    except Exception as e:
        print(json.dumps({"ok": False, "code": "ERR_SEND_CODE", "message": str(e)}))
    finally:
        await client.disconnect()

# --- Step 2: Sign in with OTP (and 2FA password if enabled) -----------
async def cmd_sign_in(phone, code, password=None):
    ensure_dirs()
    phone = normalize_phone(phone)
    code = re.sub(r"\D", "", str(code or ""))

    if not os.path.isfile(AUTH_STATE_FILE):
        print(json.dumps({"ok": False, "code": "ERR_NO_AUTH_STATE", "message": "No pending login session. Please request code again."}))
        return

    try:
        with open(AUTH_STATE_FILE, "r") as f:
            auth_data = json.load(f)
    except Exception as e:
        print(json.dumps({"ok": False, "code": "ERR_AUTH_STATE", "message": str(e)}))
        return

    phone_code_hash = auth_data.get("phone_code_hash", "")

    client = create_client()
    await client.connect()

    try:
        try:
            user = await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
        except SessionPasswordNeededError:
            if password:
                user = await client.sign_in(password=password)
            else:
                print(json.dumps({
                    "ok": False,
                    "code": "ERR_NEED_PASSWORD",
                    "need_password": True,
                    "message": "Two-step verification is enabled on your account. Please enter your cloud password."
                }))
                return

        # Cleanup staging auth state
        try:
            os.remove(AUTH_STATE_FILE)
        except Exception:
            pass

        print(json.dumps({
            "ok": True,
            "user": {
                "id": user.id,
                "first_name": user.first_name or "",
                "username": user.username or "",
                "phone": getattr(user, "phone", "")
            }
        }))
    except (PhoneCodeInvalidError, PhoneCodeExpiredError) as pe:
        print(json.dumps({"ok": False, "code": "ERR_INVALID_CODE", "message": f"Telegram code is invalid or expired: {pe}"}))
    except PasswordHashInvalidError:
        print(json.dumps({"ok": False, "code": "ERR_INVALID_PASSWORD", "message": "Incorrect 2FA password."}))
    except Exception as e:
        print(json.dumps({"ok": False, "code": "ERR_SIGNIN", "message": str(e)}))
    finally:
        await client.disconnect()

async def find_existing_storage_channel(client):
    """Scan user's dialogs for an existing VD-Backup storage channel."""
    try:
        async for dialog in client.iter_dialogs():
            if dialog.is_channel:
                title = dialog.title or ""
                if (title.startswith("VD_Backup") or title.startswith("VD_") or
                        "VD-Backup" in title or "VDBackup" in title):
                    return dialog
    except Exception:
        pass
    return None

# --- Step 3: Create private storage channel starting with VD ----------
async def cmd_init_storage(title=None):
    if not has_saved_session():
        print(json.dumps({"ok": False, "code": "ERR_NO_SESSION", "message": "Not logged in to Telegram."}))
        return

    client = create_client()
    await client.connect()

    if not await client.is_user_authorized():
        await client.disconnect()
        print(json.dumps({"ok": False, "code": "ERR_UNAUTHORIZED", "message": "Telegram session expired. Please log in again."}))
        return

    try:
        me = await client.get_me()

        # 1. First check if an existing storage channel is already present in dialogs
        existing = await find_existing_storage_channel(client)
        if existing:
            cid = str(existing.id)
            title = existing.title
            dest_data = {
                "id": "telegram",
                "type": "telegram",
                "title": "Telegram Storage",
                "channel_id": cid,
                "channel_title": title,
                "user_id": me.id,
                "user_name": me.first_name or "",
                "user_phone": getattr(me, "phone", ""),
                "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            ensure_dirs()
            with open(DEST_FILE, "w") as f:
                json.dump(dest_data, f, indent=2)
            os.chmod(DEST_FILE, 0o600)

            print(json.dumps({
                "ok": True,
                "reused": True,
                "channel_id": cid,
                "channel_title": title,
                "user": {
                    "id": me.id,
                    "first_name": me.first_name or "",
                    "username": me.username or ""
                }
            }))
            return

        # 2. Only if no existing channel exists, attempt to create one
        if not title:
            random_tag = secrets.token_hex(2).upper()
            title = f"VD_Backup_{random_tag}"
        elif not title.startswith("VD_"):
            title = f"VD_{title}"

        try:
            created = await client(CreateChannelRequest(
                title=title,
                about="VD-Backup Private Cloud Storage. Do not delete this channel!",
                megagroup=False
            ))
            channel = created.chats[0]
            channel_id = f"-100{channel.id}"
            welcome_text = (
                "🛡️ **VD-Backup Cloud Storage**\n\n"
                "This private channel is your dedicated cloud storage for Android backups created with VD-Backup.\n\n"
                "⚠️ **IMPORTANT NOTICE:**\n"
                "Do **NOT** delete this channel! All your uploaded backups are stored here. "
                "Deleting this channel will result in the loss of your cloud backups."
            )
            msg = await client.send_message(channel, welcome_text)
            try:
                await client.pin_message(channel, msg, notify=False)
            except Exception:
                pass
        except Exception as ce:
            err_str = str(ce)
            if "spamreport" in err_str.lower() or "can't create" in err_str.lower():
                channel_id = "me"
                title = "Saved Messages (Cloud Storage)"
            else:
                raise ce

        dest_data = {
            "id": "telegram",
            "type": "telegram",
            "title": "Telegram Storage",
            "channel_id": channel_id,
            "channel_title": title,
            "user_id": me.id,
            "user_name": me.first_name or "",
            "user_phone": getattr(me, "phone", ""),
            "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        }

        with open(DEST_FILE, "w") as f:
            json.dump(dest_data, f, indent=2)
        os.chmod(DEST_FILE, 0o600)

        init_index = {
            "version": 1,
            "channel_id": channel_id,
            "channel_title": title,
            "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "backups": []
        }
        with open(INDEX_CACHE_FILE, "w") as f:
            json.dump(init_index, f, indent=2)

        print(json.dumps({
            "ok": True,
            "channel_id": channel_id,
            "channel_title": title,
            "user": {
                "id": me.id,
                "first_name": me.first_name or "",
                "username": me.username or ""
            }
        }))
    except Exception as e:
        print(json.dumps({"ok": False, "code": "ERR_CREATE_CHANNEL", "message": str(e)}))
    finally:
        await client.disconnect()

# --- Check connection & status -----------------------------------------
async def cmd_check_auth():
    if not has_saved_session():
        print(json.dumps({"ok": True, "authorized": False, "dest_exists": False}))
        return

    client = create_client()
    await client.connect()

    try:
        if not await client.is_user_authorized():
            print(json.dumps({"ok": True, "authorized": False, "dest_exists": False}))
            return

        me = await client.get_me()
        dest_info = None
        if os.path.isfile(DEST_FILE):
            try:
                with open(DEST_FILE, "r") as f:
                    dest_info = json.load(f)
            except Exception:
                pass

        # If dest file doesn't exist yet, auto-detect existing VD storage channel in user's dialogs
        if not dest_info:
            existing = await find_existing_storage_channel(client)
            if existing:
                cid = str(existing.id)
                dest_info = {
                    "id": "telegram",
                    "type": "telegram",
                    "title": "Telegram Storage",
                    "channel_id": cid,
                    "channel_title": existing.title,
                    "user_id": me.id,
                    "user_name": me.first_name or "",
                    "user_phone": getattr(me, "phone", ""),
                    "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                ensure_dirs()
                with open(DEST_FILE, "w") as f:
                    json.dump(dest_info, f, indent=2)
                os.chmod(DEST_FILE, 0o600)

        print(json.dumps({
            "ok": True,
            "authorized": True,
            "user": {
                "id": me.id,
                "first_name": me.first_name or "",
                "username": me.username or "",
                "phone": getattr(me, "phone", "")
            },
            "dest": dest_info
        }))
    except Exception as e:
        print(json.dumps({"ok": False, "code": "ERR_CHECK_AUTH", "message": str(e)}))
    finally:
        await client.disconnect()

# --- Upload backup to channel ------------------------------------------
async def cmd_upload(channel_id, backup_dir, opid=None):
    if not has_saved_session():
        print(json.dumps({"ok": False, "code": "ERR_NO_SESSION", "message": "Not logged in to Telegram."}))
        return

    manifest_path = os.path.join(backup_dir, "manifest.json")
    if not os.path.isfile(manifest_path):
        print(json.dumps({"ok": False, "code": "ERR_NO_MANIFEST", "message": "Missing manifest.json in backup dir."}))
        return

    with open(manifest_path, "r") as f:
        manifest = json.load(f)

    pkg = manifest.get("package", {}).get("name", "unknown")
    label = manifest.get("package", {}).get("label") or pkg
    version_name = manifest.get("package", {}).get("versionName", "")
    version_code = manifest.get("package", {}).get("versionCode", 0)
    created_at = manifest.get("created_at", "")
    mode = manifest.get("mode", "full")
    items = [it.get("type") for it in manifest.get("items", [])]

    ts_vc = os.path.basename(backup_dir)
    ref = f"{pkg}/{ts_vc}"

    client = create_client()
    await client.connect()

    try:
        # Resolve target channel entity
        channel_peer = int(channel_id) if str(channel_id).startswith("-100") or str(channel_id).lstrip("-").isdigit() else channel_id
        entity = await client.get_entity(channel_peer)

        # Collect files to upload
        files_to_upload = []
        total_bytes = 0
        for fname in os.listdir(backup_dir):
            fpath = os.path.join(backup_dir, fname)
            if os.path.isfile(fpath):
                sz = os.path.getsize(fpath)
                sha = sha256_file(fpath)
                files_to_upload.append({"name": fname, "path": fpath, "size": sz, "sha256": sha})
                total_bytes += sz

        update_progress(opid, 92, "uploading to telegram", pkg)

        uploaded_records = []
        bytes_uploaded_so_far = 0

        for f_entry in files_to_upload:
            fname = f_entry["name"]
            fpath = f_entry["path"]
            fsize = f_entry["size"]
            fsha = f_entry["sha256"]

            caption = f"VD_FILE|{pkg}|{ts_vc}|{fname}|{fsha}"

            def progress_callback(current, total):
                nonlocal bytes_uploaded_so_far
                current_total = bytes_uploaded_so_far + current
                pct = 92 + int((current_total * 6) / (total_bytes + 1))
                pct = min(98, max(92, pct))
                update_progress(opid, pct, f"telegram: {fname}", pkg)

            sent_msg = await client.send_file(
                entity,
                fpath,
                caption=caption,
                progress_callback=progress_callback
            )

            bytes_uploaded_so_far += fsize
            uploaded_records.append({
                "name": fname,
                "size": fsize,
                "sha256": fsha,
                "message_id": sent_msg.id
            })

        # Send readable summary message in channel
        summary = (
            f"📦 **VD-Backup Archive**\n"
            f"• **App:** {label} (`{pkg}`)\n"
            f"• **Version:** {version_name} ({version_code})\n"
            f"• **Date:** {created_at}\n"
            f"• **Mode:** {mode}\n"
            f"• **Size:** {round(total_bytes / (1024*1024), 2)} MB\n"
            f"• **Ref:** `{ref}`"
        )
        await client.send_message(entity, summary)

        # Update index
        new_backup_entry = {
            "ref": ref,
            "package": pkg,
            "label": label,
            "versionName": version_name,
            "versionCode": version_code,
            "created_at": created_at,
            "mode": mode,
            "size": total_bytes,
            "items": items,
            "files": uploaded_records
        }

        # Load existing index cache or empty
        index_data = {"version": 1, "backups": []}
        if os.path.isfile(INDEX_CACHE_FILE):
            try:
                with open(INDEX_CACHE_FILE, "r") as f:
                    index_data = json.load(f)
            except Exception:
                pass

        # Prepend new backup (latest first) and deduplicate
        existing = [b for b in index_data.get("backups", []) if b.get("ref") != ref]
        index_data["backups"] = [new_backup_entry] + existing
        index_data["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Save local cache
        with open(INDEX_CACHE_FILE, "w") as f:
            json.dump(index_data, f, indent=2)

        # Post updated index document to channel and pin it
        stg_index = os.path.join(STAGING_DIR, "index.json")
        with open(stg_index, "w") as f:
            json.dump(index_data, f, indent=2)

        idx_msg = await client.send_file(
            entity,
            stg_index,
            caption="VD_BACKUP_INDEX"
        )
        try:
            await client.pin_message(entity, idx_msg, notify=False)
        except Exception:
            pass

        try:
            os.remove(stg_index)
        except Exception:
            pass

        update_progress(opid, 100, "done", pkg)
        print(json.dumps({"ok": True, "uploaded": True, "ref": ref, "size": total_bytes}))
    except Exception as e:
        print(json.dumps({"ok": False, "code": "ERR_UPLOAD", "message": str(e)}))
    finally:
        await client.disconnect()

# --- List remote backups in channel -------------------------------------
async def cmd_list_backups(channel_id):
    if not has_saved_session():
        print(json.dumps({"ok": False, "code": "ERR_NO_SESSION", "message": "Not logged in to Telegram."}))
        return

    client = create_client()
    await client.connect()

    try:
        channel_peer = int(channel_id) if str(channel_id).startswith("-100") or str(channel_id).lstrip("-").isdigit() else channel_id
        entity = await client.get_entity(channel_peer)

        # Check pinned messages or search for VD_BACKUP_INDEX
        found_index = None
        async for msg in client.iter_messages(entity, limit=20):
            if msg.document and (msg.file.name == "index.json" or (msg.text and "VD_BACKUP_INDEX" in msg.text)):
                temp_idx_path = os.path.join(STAGING_DIR, f"idx_{msg.id}.json")
                await client.download_media(msg, temp_idx_path)
                try:
                    with open(temp_idx_path, "r") as f:
                        found_index = json.load(f)
                    os.remove(temp_idx_path)
                    break
                except Exception:
                    pass

        if found_index and "backups" in found_index:
            with open(INDEX_CACHE_FILE, "w") as f:
                json.dump(found_index, f, indent=2)
            print(json.dumps({"ok": True, "backups": found_index["backups"]}))
            return

        # Fallback to local index cache
        if os.path.isfile(INDEX_CACHE_FILE):
            with open(INDEX_CACHE_FILE, "r") as f:
                cached = json.load(f)
            print(json.dumps({"ok": True, "backups": cached.get("backups", [])}))
            return

        print(json.dumps({"ok": True, "backups": []}))
    except Exception as e:
        # Fallback to local cache if offline
        if os.path.isfile(INDEX_CACHE_FILE):
            try:
                with open(INDEX_CACHE_FILE, "r") as f:
                    cached = json.load(f)
                print(json.dumps({"ok": True, "backups": cached.get("backups", [])}))
                return
            except Exception:
                pass
        print(json.dumps({"ok": False, "code": "ERR_LIST_BACKUPS", "message": str(e)}))
    finally:
        await client.disconnect()

# --- Download backup from channel ---------------------------------------
async def cmd_download(channel_id, ref, target_dir, opid=None):
    if not has_saved_session():
        print(json.dumps({"ok": False, "code": "ERR_NO_SESSION", "message": "Not logged in to Telegram."}))
        return

    os.makedirs(target_dir, exist_ok=True)
    update_progress(opid, 5, "connecting to telegram")

    client = create_client()
    await client.connect()

    try:
        channel_peer = int(channel_id) if str(channel_id).startswith("-100") or str(channel_id).lstrip("-").isdigit() else channel_id
        entity = await client.get_entity(channel_peer)

        # Locate backup in index
        backup_info = None
        if os.path.isfile(INDEX_CACHE_FILE):
            try:
                with open(INDEX_CACHE_FILE, "r") as f:
                    idx = json.load(f)
                for b in idx.get("backups", []):
                    if b.get("ref") == ref:
                        backup_info = b
                        break
            except Exception:
                pass

        # If not in cache, fetch index from channel
        if not backup_info:
            async for msg in client.iter_messages(entity, limit=20):
                if msg.document and (msg.file.name == "index.json" or (msg.text and "VD_BACKUP_INDEX" in msg.text)):
                    temp_idx = os.path.join(STAGING_DIR, f"idx_{msg.id}.json")
                    await client.download_media(msg, temp_idx)
                    try:
                        with open(temp_idx, "r") as f:
                            idx = json.load(f)
                        os.remove(temp_idx)
                        for b in idx.get("backups", []):
                            if b.get("ref") == ref:
                                backup_info = b
                                break
                    except Exception:
                        pass
                if backup_info:
                    break

        if not backup_info:
            print(json.dumps({"ok": False, "code": "ERR_BACKUP_NOT_FOUND", "message": f"Backup {ref} not found in channel index."}))
            return

        files = backup_info.get("files", [])
        total_files = len(files)
        total_size = backup_info.get("size", 1)
        bytes_downloaded = 0

        for idx, file_entry in enumerate(files):
            fname = file_entry["name"]
            msg_id = file_entry.get("message_id")
            want_sha = file_entry.get("sha256", "")
            fsize = file_entry.get("size", 0)

            out_path = os.path.join(target_dir, fname)

            msg = await client.get_messages(entity, ids=msg_id)
            if not msg or not msg.document:
                # Search by caption prefix if message id changed
                async for m in client.iter_messages(entity, search=f"|{ref}|{fname}|"):
                    if m.document:
                        msg = m
                        break

            if not msg or not msg.document:
                print(json.dumps({"ok": False, "code": "ERR_FILE_NOT_FOUND", "message": f"File {fname} not found in Telegram channel."}))
                return

            def dl_progress(current, total):
                nonlocal bytes_downloaded
                cur_total = bytes_downloaded + current
                pct = 5 + int((cur_total * 85) / (total_size + 1))
                pct = min(90, max(5, pct))
                update_progress(opid, pct, f"downloading: {fname}")

            await client.download_media(msg, out_path, progress_callback=dl_progress)
            bytes_downloaded += fsize

            if want_sha:
                got_sha = sha256_file(out_path)
                if got_sha != want_sha:
                    print(json.dumps({"ok": False, "code": "ERR_VERIFY", "message": f"SHA-256 mismatch for {fname}"}))
                    return

        update_progress(opid, 92, "download complete")
        print(json.dumps({"ok": True, "downloaded": True, "path": target_dir}))
    except Exception as e:
        print(json.dumps({"ok": False, "code": "ERR_DOWNLOAD", "message": str(e)}))
    finally:
        await client.disconnect()

# --- Logout -------------------------------------------------------------
async def cmd_logout():
    if has_saved_session():
        try:
            client = create_client()
            await client.connect()
            if await client.is_user_authorized():
                await client.log_out()
            await client.disconnect()
        except Exception:
            pass

    for f in [SESSION_PATH + ".session", AUTH_STATE_FILE, DEST_FILE, INDEX_CACHE_FILE]:
        if os.path.isfile(f):
            try:
                os.remove(f)
            except Exception:
                pass

    print(json.dumps({"ok": True, "logged_out": True}))

# --- CLI Router ---------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="VD-Backup Telegram Storage Engine")
    subparsers = parser.add_subparsers(dest="command")

    p_send = subparsers.add_parser("send-code")
    p_send.add_argument("--phone", required=True, help="Phone number with country code")

    p_sign = subparsers.add_parser("sign-in")
    p_sign.add_argument("--phone", required=True, help="Phone number")
    p_sign.add_argument("--code", required=True, help="Telegram OTP code")
    p_sign.add_argument("--password", help="2FA cloud password if enabled")

    p_init = subparsers.add_parser("init-storage")
    p_init.add_argument("--title", help="Channel title (defaults to VD_Backup_<random>)")

    subparsers.add_parser("check-auth")

    p_up = subparsers.add_parser("upload")
    p_up.add_argument("--dest", required=True, help="Channel ID")
    p_up.add_argument("--dir", required=True, help="Local backup directory to upload")
    p_up.add_argument("--opid", help="Operation ID for progress reporting")

    p_list = subparsers.add_parser("list-backups")
    p_list.add_argument("--dest", required=True, help="Channel ID")

    p_dl = subparsers.add_parser("download")
    p_dl.add_argument("--dest", required=True, help="Channel ID")
    p_dl.add_argument("--ref", required=True, help="Backup ref (<pkg>/<ts_vc>)")
    p_dl.add_argument("--out", required=True, help="Output directory")
    p_dl.add_argument("--opid", help="Operation ID for progress reporting")

    subparsers.add_parser("logout")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "send-code":
        asyncio.run(cmd_send_code(args.phone))
    elif args.command == "sign-in":
        asyncio.run(cmd_sign_in(args.phone, args.code, args.password))
    elif args.command == "init-storage":
        asyncio.run(cmd_init_storage(args.title))
    elif args.command == "check-auth":
        asyncio.run(cmd_check_auth())
    elif args.command == "upload":
        asyncio.run(cmd_upload(args.dest, args.dir, args.opid))
    elif args.command == "list-backups":
        asyncio.run(cmd_list_backups(args.dest))
    elif args.command == "download":
        asyncio.run(cmd_download(args.dest, args.ref, args.out, args.opid))
    elif args.command == "logout":
        asyncio.run(cmd_logout())

if __name__ == "__main__":
    main()
