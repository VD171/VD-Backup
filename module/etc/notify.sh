#!/system/bin/sh
# ======================================================================
#  VD BACKUP  ::  root backup & restore, no grant prompt
#  Full app/data backup & restore as root - KernelSU/APatch/Magisk WebUI.
#
#  Copyright (C) 2026  VD171
#  SPDX-License-Identifier: AGPL-3.0-or-later
#
#  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
#  modified version, even as a service, and you MUST offer its source.
#
#  Site           : https://vd171.ru
#  Site           : https://vd.priv8.ru
#  Source         : https://github.com/VD171/VD-Backup
#  GitHub         : @VD171 https://github.com/VD171
#  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
#  XDA thread     : https://xdaforums.com/t/VD-Backup.4807267/
#  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
#  Channel        : @Priv8_VD https://t.me/Priv8_VD
#  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
#  E-mail         : vd.priv8@pm.me
# ======================================================================
#
#  Localized notification strings for worker.sh notify().
#  vdb_notify_msg <lang> <key> <name> echoes "<localized prefix><name>".
#  key: backup_start | backup_done | restore_start | restore_done.
#  Covers the 21 WebUI languages; unknown/auto falls back to English.
#  Text kept in sync with webroot/lang/<code>.json notif_* keys.

vdb_notify_msg() {
  _l="$1"; _k="$2"; _n="$3"; _p=""
  case "$_l" in
    ar|cs|de|en|es|fa|fr|hi|in|it|ja|ko|nl|pl|pt|ru|sv|th|tr|vi|zh) ;;
    *) _l=en ;;
  esac
  case "$_l" in
    ar) case "$_k" in
          backup_start)  _p="بدأ النسخ الاحتياطي: " ;;
          backup_done)   _p="اكتمل النسخ الاحتياطي: " ;;
          restore_start) _p="بدأت الاستعادة: " ;;
          restore_done)  _p="اكتملت الاستعادة: " ;;
        esac ;;
    cs) case "$_k" in
          backup_start)  _p="Záloha zahájena: " ;;
          backup_done)   _p="Záloha dokončena: " ;;
          restore_start) _p="Obnovení zahájeno: " ;;
          restore_done)  _p="Obnovení dokončeno: " ;;
        esac ;;
    de) case "$_k" in
          backup_start)  _p="Backup gestartet: " ;;
          backup_done)   _p="Backup abgeschlossen: " ;;
          restore_start) _p="Wiederherstellung gestartet: " ;;
          restore_done)  _p="Wiederherstellung abgeschlossen: " ;;
        esac ;;
    es) case "$_k" in
          backup_start)  _p="Copia iniciada: " ;;
          backup_done)   _p="Copia finalizada: " ;;
          restore_start) _p="Restauración iniciada: " ;;
          restore_done)  _p="Restauración finalizada: " ;;
        esac ;;
    fa) case "$_k" in
          backup_start)  _p="پشتیبان‌گیری آغاز شد: " ;;
          backup_done)   _p="پشتیبان‌گیری کامل شد: " ;;
          restore_start) _p="بازیابی آغاز شد: " ;;
          restore_done)  _p="بازیابی کامل شد: " ;;
        esac ;;
    fr) case "$_k" in
          backup_start)  _p="Sauvegarde démarrée : " ;;
          backup_done)   _p="Sauvegarde terminée : " ;;
          restore_start) _p="Restauration démarrée : " ;;
          restore_done)  _p="Restauration terminée : " ;;
        esac ;;
    hi) case "$_k" in
          backup_start)  _p="बैकअप शुरू: " ;;
          backup_done)   _p="बैकअप पूर्ण: " ;;
          restore_start) _p="पुनर्स्थापना शुरू: " ;;
          restore_done)  _p="पुनर्स्थापना पूर्ण: " ;;
        esac ;;
    in) case "$_k" in
          backup_start)  _p="Pencadangan dimulai: " ;;
          backup_done)   _p="Pencadangan selesai: " ;;
          restore_start) _p="Pemulihan dimulai: " ;;
          restore_done)  _p="Pemulihan selesai: " ;;
        esac ;;
    it) case "$_k" in
          backup_start)  _p="Backup avviato: " ;;
          backup_done)   _p="Backup completato: " ;;
          restore_start) _p="Ripristino avviato: " ;;
          restore_done)  _p="Ripristino completato: " ;;
        esac ;;
    ja) case "$_k" in
          backup_start)  _p="バックアップ開始: " ;;
          backup_done)   _p="バックアップ完了: " ;;
          restore_start) _p="復元開始: " ;;
          restore_done)  _p="復元完了: " ;;
        esac ;;
    ko) case "$_k" in
          backup_start)  _p="백업 시작: " ;;
          backup_done)   _p="백업 완료: " ;;
          restore_start) _p="복원 시작: " ;;
          restore_done)  _p="복원 완료: " ;;
        esac ;;
    nl) case "$_k" in
          backup_start)  _p="Back-up gestart: " ;;
          backup_done)   _p="Back-up voltooid: " ;;
          restore_start) _p="Herstel gestart: " ;;
          restore_done)  _p="Herstel voltooid: " ;;
        esac ;;
    pl) case "$_k" in
          backup_start)  _p="Rozpoczęto kopię: " ;;
          backup_done)   _p="Ukończono kopię: " ;;
          restore_start) _p="Rozpoczęto przywracanie: " ;;
          restore_done)  _p="Ukończono przywracanie: " ;;
        esac ;;
    pt) case "$_k" in
          backup_start)  _p="Backup iniciado: " ;;
          backup_done)   _p="Backup concluído: " ;;
          restore_start) _p="Restauração iniciada: " ;;
          restore_done)  _p="Restauração concluída: " ;;
        esac ;;
    ru) case "$_k" in
          backup_start)  _p="Копирование начато: " ;;
          backup_done)   _p="Копирование завершено: " ;;
          restore_start) _p="Восстановление начато: " ;;
          restore_done)  _p="Восстановление завершено: " ;;
        esac ;;
    sv) case "$_k" in
          backup_start)  _p="Säkerhetskopiering startad: " ;;
          backup_done)   _p="Säkerhetskopiering klar: " ;;
          restore_start) _p="Återställning startad: " ;;
          restore_done)  _p="Återställning klar: " ;;
        esac ;;
    th) case "$_k" in
          backup_start)  _p="เริ่มสำรองข้อมูล: " ;;
          backup_done)   _p="สำรองข้อมูลเสร็จ: " ;;
          restore_start) _p="เริ่มคืนค่า: " ;;
          restore_done)  _p="คืนค่าเสร็จ: " ;;
        esac ;;
    tr) case "$_k" in
          backup_start)  _p="Yedekleme başladı: " ;;
          backup_done)   _p="Yedekleme tamamlandı: " ;;
          restore_start) _p="Geri yükleme başladı: " ;;
          restore_done)  _p="Geri yükleme tamamlandı: " ;;
        esac ;;
    vi) case "$_k" in
          backup_start)  _p="Đã bắt đầu sao lưu: " ;;
          backup_done)   _p="Đã hoàn tất sao lưu: " ;;
          restore_start) _p="Đã bắt đầu khôi phục: " ;;
          restore_done)  _p="Đã hoàn tất khôi phục: " ;;
        esac ;;
    zh) case "$_k" in
          backup_start)  _p="备份已开始：" ;;
          backup_done)   _p="备份已完成：" ;;
          restore_start) _p="恢复已开始：" ;;
          restore_done)  _p="恢复已完成：" ;;
        esac ;;
    *) case "$_k" in
          backup_start)  _p="Backup started: " ;;
          backup_done)   _p="Backup finished: " ;;
          restore_start) _p="Restore started: " ;;
          restore_done)  _p="Restore finished: " ;;
        esac ;;
  esac
  [ -n "$_p" ] || _p="$_k: "
  printf '%s%s\n' "$_p" "$_n"
}
