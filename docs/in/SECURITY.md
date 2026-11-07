> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · Bahasa Indonesia · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Kebijakan Keamanan

VDBackup berjalan sebagai root dan menangani data Anda serta (secara opsional) kredensial dan
frasa-sandi enkripsi Anda. Kami menanggapi keamanan dengan serius.

## Melaporkan kerentanan

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (hanya laporan non-keamanan)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Sertakan deskripsi yang jelas dan, jika memungkinkan, langkah-langkah untuk mereproduksi. Kami akan merespons
secepat mungkin dan memberi Anda kredit jika Anda menginginkannya.

## Catatan ruang lingkup

- Kredensial dan frasa-sandi disimpan terenkripsi saat tidak digunakan dan tidak pernah ditulis dalam
  teks jelas. Backup tidak pernah terikat ke kunci perangkat keras yang terikat-perangkat (sehingga tetap
  portabel), yang juga berarti frasa-sandi adalah yang melindungi backup terenkripsi -
  pilihlah yang kuat.
- Aplikasi pendamping Google Drive opsional sebaiknya selalu disembunyikan dengan HMA-OSS agar
  tidak mengungkap root atau bootloader yang tidak terkunci.
- Pemulihan berjalan sebagai root, jadi setiap arsip diperiksa sebelum apa pun ditulis: sebuah
  backup yang isinya menunjuk ke luar targetnya (sebuah path absolut atau komponen `..`) akan
  ditolak, dan tidak ada berkas yang diekstrak sampai seluruh arsip lolos pemeriksaan.
- Setiap biner dan pustaka prakompilasi dapat dilacak ke upstream publik yang disematkan dengan
  SHA-256 yang tercatat, dan manifes disertakan di perangkat, sehingga muatan yang dibundel dapat
  diaudit dan direproduksi. Lihat [BINARIES.md](BINARIES.md).

*Dokumentasi ini dihasilkan dengan Claude (Anthropic) dan dikelola oleh VD171. Koreksi dan perbaikan dipersilakan - lihat [CONTRIBUTING.md](CONTRIBUTING.md).*
