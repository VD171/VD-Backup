> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · Türkçe · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Güvenlik Politikası

VDBackup root olarak çalışır ve verilerinizi ve (isteğe bağlı olarak) kimlik
bilgilerinizi ve şifreleme parolalarınızı işler. Güvenliği ciddiye alıyoruz.

## Bir güvenlik açığını bildirme

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

Açık bir açıklama ve mümkünse yeniden üretme adımlarını ekleyin. Elimizden geldiğince
çabuk yanıt vereceğiz ve isterseniz size atıfta bulunacağız.

## Kapsam notları

- Kimlik bilgileri ve parolalar beklemede şifreli olarak saklanır ve asla düz metin
  olarak yazılmaz. Yedekler asla cihaza bağlı donanım anahtarlarına bağlanmaz (böylece
  taşınabilir kalırlar), bu da şifreli bir yedeği parolanın koruduğu anlamına gelir -
  güçlü bir parola seçin.
- Bu kimlik bilgileri, yeniden başlatmadan sonraki ilk kilit açmaya kadar kilitli kalan kimlik bilgisiyle şifreli depolamada (`/data/misc_ce`) bulunur; bu nedenle `/data/adb`'nin aksine o açılmadan önce asla okunamaz. Bir modül güncellemesi eski kopyaları oraya kalıcı olarak taşır (orijinali silmeden önce her birini doğrular) ve yeniden kurulumlar arasında kalıcıdır.
- Yerel bir yedek hedefi de beklemede şifreli kalmalıdır: yalnızca dahili ve çıkarılabilir kullanıcı depolaması izinlidir, asla `/data/adb`, `/data/system` ya da ilk kilit açmadan önce okunabilen başka yollar ve asla bir `..` geçişi. Çıkarılabilir SD/USB beklemede hiç şifreli değildir, bu yüzden bunun için yedek şifrelemesini açmanız konusunda uyarılırsınız (engellenmezsiniz).
- İsteğe bağlı Google Drive yardımcı uygulaması, root'u veya kilidi açılmış bir
  önyükleyiciyi ifşa etmemesi için her zaman [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) ile gizlenmelidir.
- Geri yükleme root olarak çalışır, bu yüzden herhangi bir şey yazılmadan önce her arşiv
  denetlenir: içeriği hedefinin dışını gösteren bir yedek (mutlak bir yol veya bir `..`
  bileşeni) reddedilir ve arşivin tamamı onaylanana kadar hiçbir dosya çıkarılmaz.
- Her önceden derlenmiş ikili dosya ve kütüphane, kaydedilmiş bir SHA-256 ile sabitlenmiş genel bir
  upstream'e kadar izlenebilir ve manifest cihazda birlikte gelir, böylece paketlenmiş yük denetlenebilir
  ve yeniden üretilebilir. Bkz. [BINARIES.md](BINARIES.md).

<!-- doc-footer -->

---

> _Bu belgeler Claude (Anthropic) ile oluşturulmuş olup VD171 tarafından yürütülmektedir. Düzeltmeler ve iyileştirmeler memnuniyetle karşılanır; bkz. [CONTRIBUTING.md](CONTRIBUTING.md)._
