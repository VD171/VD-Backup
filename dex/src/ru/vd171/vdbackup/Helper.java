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
 *
 *  Framework helper run as root via app_process (no installed app):
 *     app_process -Djava.class.path=vdbackup_helper.dex /system/bin \
 *         ru.vd171.vdbackup.Helper <verb> [args...]
 *  Verbs: list-apps | label <pkg> | icon <pkg> <out.png> | notify <title> <text>
 *  Gives the engine real app labels/icons and reliable notifications. It is the
 *  place the richer framework work (SSAID, AppOps, StorageStats, Neo decrypt) grows.
 *
 *  STATUS: WIP. Compiles + dexes fine. list-apps goes through IPackageManager via
 *  ServiceManager (no ActivityThread/Looper), so it works where systemMain() hangs
 *  (Moto/A16). label/icon/notify still use the systemContext() path. The shell engine
 *  never depends on this (it only uses the dex when present, else falls back), so
 *  shipping without it is safe.
 */
package ru.vd171.vdbackup;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.IBinder;
import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;

public final class Helper {

    // system Context from the app_process host (hidden API via reflection, so this
    // compiles against the public android.jar without the hidden-API stubs).
    private static Context systemContext() throws Exception {
        Class<?> at = Class.forName("android.app.ActivityThread");
        Method main = at.getMethod("systemMain");
        Object thread = main.invoke(null);
        Method get = at.getMethod("getSystemContext");
        return (Context) get.invoke(thread);
    }

    // list-apps without ActivityThread/Looper: talk to IPackageManager straight
    // through ServiceManager (both hidden APIs, reached by reflection so this still
    // compiles against the public android.jar). Works where systemMain() hangs.
    private static void listAppsViaServiceManager(int userId) throws Exception {
        Class<?> sm = Class.forName("android.os.ServiceManager");
        IBinder binder = (IBinder) sm.getMethod("getService", String.class).invoke(null, "package");
        if (binder == null) throw new IllegalStateException("package service unavailable");
        Class<?> stub = Class.forName("android.content.pm.IPackageManager$Stub");
        Object ipm = stub.getMethod("asInterface", IBinder.class).invoke(null, binder);

        // getInstalledPackages (not getInstalledApplications): PackageInfo carries the
        // versionCode, which the WebUI uses to key the icon cache so it invalidates when
        // an app updates. applicationInfo is populated by default and gives label/flags.
        Method getPkgs = null;
        for (Method m : ipm.getClass().getMethods()) {
            if ("getInstalledPackages".equals(m.getName()) && m.getParameterTypes().length == 2) {
                getPkgs = m;
                break;
            }
        }
        if (getPkgs == null) throw new NoSuchMethodException("getInstalledPackages");
        Class<?>[] pt = getPkgs.getParameterTypes();
        Object flagsArg = (pt[0] == long.class) ? (Object) 0L : (Object) 0;
        Object slice = getPkgs.invoke(ipm, flagsArg, userId);

        List<?> apps;
        if (slice == null) {
            apps = java.util.Collections.emptyList();
        } else {
            apps = (List<?>) slice.getClass().getMethod("getList").invoke(slice);
        }

        StringBuilder sb = new StringBuilder("{\"ok\":true,\"source\":\"dex\",\"apps\":[");
        boolean first = true;
        for (Object o : apps) {
            PackageInfo pi = (PackageInfo) o;
            ApplicationInfo ai = pi.applicationInfo;
            if (ai == null) continue;
            if (!first) sb.append(',');
            first = false;
            String label = esc(labelOf(ai));
            boolean sys = (ai.flags & ApplicationInfo.FLAG_SYSTEM) != 0;
            long vc = (Build.VERSION.SDK_INT >= 28) ? pi.getLongVersionCode() : (long) pi.versionCode;
            sb.append("{\"package\":\"").append(esc(ai.packageName)).append("\",\"label\":\"")
              .append(label).append("\",\"system\":").append(sys)
              .append(",\"versionCode\":").append(vc).append('}');
        }
        sb.append("]}");
        System.out.println(sb);
    }

    // ApplicationInfo via IPackageManager/ServiceManager (no Context, reflection so it
    // still compiles against public android.jar). Works where systemMain() hangs.
    private static ApplicationInfo appInfo(String pkg, int userId) throws Exception {
        Class<?> sm = Class.forName("android.os.ServiceManager");
        IBinder binder = (IBinder) sm.getMethod("getService", String.class).invoke(null, "package");
        if (binder == null) throw new IllegalStateException("package service unavailable");
        Class<?> stub = Class.forName("android.content.pm.IPackageManager$Stub");
        Object ipm = stub.getMethod("asInterface", IBinder.class).invoke(null, binder);
        Method gai = null;
        for (Method m : ipm.getClass().getMethods()) {
            if ("getApplicationInfo".equals(m.getName()) && m.getParameterTypes().length == 3) { gai = m; break; }
        }
        if (gai == null) throw new NoSuchMethodException("getApplicationInfo");
        Class<?>[] pt = gai.getParameterTypes();
        Object flags = (pt[1] == long.class) ? (Object) 0L : (Object) 0;
        ApplicationInfo ai = (ApplicationInfo) gai.invoke(ipm, pkg, flags, userId);
        if (ai == null) throw new IllegalStateException("no ApplicationInfo for " + pkg);
        return ai;
    }

    // APK resources through a bare AssetManager (no Context, so systemMain() never runs).
    private static Resources apkResources(ApplicationInfo ai) throws Exception {
        String apk = (ai.sourceDir != null) ? ai.sourceDir : ai.publicSourceDir;
        if (apk == null) return null;
        AssetManager am = AssetManager.class.getDeclaredConstructor().newInstance();
        AssetManager.class.getMethod("addAssetPath", String.class).invoke(am, apk);
        return new Resources(am, Resources.getSystem().getDisplayMetrics(),
                             Resources.getSystem().getConfiguration());
    }

    // The real app label: nonLocalizedLabel is null for most apps, so resolve the
    // localized labelRes from the APK's own resources (what getApplicationLabel does).
    private static String labelOf(ApplicationInfo ai) {
        CharSequence nl = ai.nonLocalizedLabel;
        if (nl != null) {
            String s = nl.toString().trim();
            if (!s.isEmpty()) return s;
        }
        if (ai.labelRes != 0) {
            try {
                Resources r = apkResources(ai);
                if (r != null) {
                    String s = r.getString(ai.labelRes);
                    if (s != null && !s.trim().isEmpty()) return s.trim();
                }
            } catch (Throwable ignore) {}
        }
        return ai.packageName;
    }

    // App icon without ActivityThread: get the ApplicationInfo via IPackageManager,
    // load the APK's resources through a bare AssetManager (no Context, so systemMain()
    // never runs), render the icon drawable to a small PNG. Works where the context
    // path hangs. Writes a 144x144 PNG to <out>.
    private static void iconFree(String pkg, String out, int userId) throws Exception {
        ApplicationInfo ai = appInfo(pkg, userId);
        int resId = ai.icon;
        Resources res = apkResources(ai);
        if (resId == 0 || res == null) throw new IllegalStateException("no icon resource");
        Drawable d = res.getDrawable(resId, null);
        if (d == null) throw new IllegalStateException("icon drawable null");
        // Render app-like: a rounded-square mask on every icon for a consistent launcher
        // look. Adaptive icons (API26+) carry a 1/6 bleed per edge meant to be masked off
        // by the launcher; without cropping it the content looks zoomed out, so scale the
        // drawable up to push that bleed past the frame.
        int size = 144;
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        float r = size * 0.22f;
        Path clip = new Path();
        clip.addRoundRect(new RectF(0, 0, size, size), r, r, Path.Direction.CW);
        canvas.clipPath(clip);
        boolean adaptive = false;
        if (Build.VERSION.SDK_INT >= 26) {
            try { adaptive = Class.forName("android.graphics.drawable.AdaptiveIconDrawable").isInstance(d); }
            catch (Throwable ignore) {}
        }
        if (adaptive) {
            int bleed = size / 6;
            d.setBounds(-bleed, -bleed, size + bleed, size + bleed);
        } else {
            d.setBounds(0, 0, size, size);
        }
        d.draw(canvas);
        try (FileOutputStream fos = new FileOutputStream(out)) {
            bmp.compress(Bitmap.CompressFormat.PNG, 100, fos);
        }
    }

    // Neo-Backup password crypto: AES/GCM/NoPadding, key = PBKDF2withHmacSHA256
    // (iter=2020, 256-bit), 128-bit tag. Portable (no Keystore), matches upstream
    // CryptoUtils.kt. Decrypts in -> out; the plaintext is still the compressed tar,
    // which the shell engine then decompresses and untars.
    private static byte[] parseIv(String s) {
        s = s.trim();
        if (s.startsWith("[")) {
            String[] parts = s.substring(1, s.length() - 1).split(",");
            byte[] iv = new byte[parts.length];
            for (int i = 0; i < parts.length; i++) iv[i] = (byte) Integer.parseInt(parts[i].trim());
            return iv;
        }
        return Base64.getDecoder().decode(s);
    }

    private static void neoDecrypt(String in, String out, String password, String salt, String ivSpec)
            throws Exception {
        SecretKeyFactory f = SecretKeyFactory.getInstance("PBKDF2withHmacSHA256");
        byte[] key = f.generateSecret(new PBEKeySpec(password.toCharArray(), salt.getBytes("UTF-8"), 2020, 256))
                      .getEncoded();
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, parseIv(ivSpec)));
        try (InputStream fis = new FileInputStream(in);
             CipherInputStream cis = new CipherInputStream(fis, c);
             OutputStream fos = new FileOutputStream(out)) {
            byte[] buf = new byte[65536];
            int n;
            while ((n = cis.read(buf)) != -1) fos.write(buf, 0, n);
        }
    }

    private static String esc(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default: if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
            }
        }
        return b.toString();
    }

    public static void main(String[] args) {
        try {
            if (args.length == 0) { System.out.println("{\"ok\":false,\"code\":\"ERR_NO_VERB\"}"); return; }
            String verb = args[0];

            // context-free verbs first: never touch ActivityThread (systemMain()
            // hangs on some ROMs) for work that does not need the framework.
            if ("neo-decrypt".equals(verb)) {
                // neo-decrypt <in> <out> <password|-> [salt=oandbackupx] [ivBase64OrArray]
                // password "-" reads VDB_NEO_PASS from the environment (keeps it out of argv/ps).
                String pw = "-".equals(args[3]) ? System.getenv("VDB_NEO_PASS") : args[3];
                if (pw == null) pw = "";
                String salt = (args.length > 4 && args[4].length() > 0) ? args[4] : "oandbackupx";
                String iv = (args.length > 5) ? args[5] : "";
                neoDecrypt(args[1], args[2], pw, salt, iv);
                System.out.println("{\"ok\":true,\"verb\":\"neo-decrypt\",\"out\":\"" + esc(args[2]) + "\"}");
                System.out.flush();
                System.exit(0);
                return;
            }

            if ("list-apps".equals(verb)) {
                int userId = 0;
                if (args.length > 1) { try { userId = Integer.parseInt(args[1]); } catch (NumberFormatException ignore) { } }
                listAppsViaServiceManager(userId);
                System.out.flush();
                System.exit(0);
                return;
            }

            if ("icon".equals(verb)) {
                // icon <pkg> <out.png> [userId] - context-free, never hangs
                int userId = 0;
                if (args.length > 3) { try { userId = Integer.parseInt(args[3]); } catch (NumberFormatException ignore) { } }
                iconFree(args[1], args[2], userId);
                System.out.println("{\"ok\":true,\"icon\":\"" + esc(args[2]) + "\"}");
                System.out.flush();
                System.exit(0);
                return;
            }

            if ("icons".equals(verb)) {
                // icons <userId> <listfile> - batch: one JVM renders many icons.
                // listfile: one "pkg\t/abs/out.png" per line. Amortizes JVM startup.
                int userId = 0;
                try { userId = Integer.parseInt(args[1]); } catch (Exception ignore) { }
                int rendered = 0; StringBuilder failed = new StringBuilder();
                try (BufferedReader br = new BufferedReader(new FileReader(args[2]))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        int t = line.indexOf('\t');
                        if (t <= 0) continue;
                        String pkg = line.substring(0, t), out = line.substring(t + 1);
                        try { iconFree(pkg, out, userId); rendered++; }
                        catch (Throwable e) { if (failed.length() > 0) failed.append(','); failed.append('"').append(esc(pkg)).append('"'); }
                    }
                }
                System.out.println("{\"ok\":true,\"rendered\":" + rendered + ",\"failed\":[" + failed + "]}");
                System.out.flush();
                System.exit(0);
                return;
            }

            if ("label".equals(verb)) {
                // label <pkg> [userId] - context-free, never hangs
                int userId = 0;
                if (args.length > 2) { try { userId = Integer.parseInt(args[2]); } catch (NumberFormatException ignore) { } }
                System.out.println("{\"ok\":true,\"label\":\"" + esc(labelOf(appInfo(args[1], userId))) + "\"}");
                System.out.flush();
                System.exit(0);
                return;
            }

            Context ctx = systemContext();

            if ("notify".equals(verb)) {
                // best-effort; cmd notification is the primary path in the shell engine
                Object nm = ctx.getSystemService("notification");
                System.out.println("{\"ok\":" + (nm != null) + ",\"verb\":\"notify\"}");

            } else {
                System.out.println("{\"ok\":false,\"code\":\"ERR_UNKNOWN_VERB\"}");
            }
        } catch (Throwable t) {
            System.out.println("{\"ok\":false,\"code\":\"ERR_DEX\",\"message\":\"" + esc(t.toString()) + "\"}");
        }
        // ActivityThread leaves non-daemon threads alive; force exit so app_process returns.
        System.out.flush();
        System.exit(0);
    }
}
