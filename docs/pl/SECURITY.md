> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · Polski · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Українська](../uk/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# Polityka bezpieczeństwa

VDBackup działa jako root i obsługuje Twoje dane oraz (opcjonalnie) Twoje poświadczenia i
hasła szyfrujące. Traktujemy bezpieczeństwo poważnie.

## Zgłaszanie luki

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

Dołącz jasny opis oraz, jeśli to możliwe, kroki do odtworzenia. Odpowiemy tak
szybko, jak zdołamy, i wymienimy Cię w podziękowaniach, jeśli sobie tego życzysz.

## Uwagi o zakresie

- Poświadczenia i hasła są przechowywane w postaci zaszyfrowanej w spoczynku i nigdy nie są zapisywane
  jawnym tekstem. Kopie zapasowe nigdy nie są powiązane z kluczami sprzętowymi urządzenia (więc pozostają
  przenośne), co oznacza również, że to hasło chroni zaszyfrowaną kopię zapasową -
  wybierz silne.
- Te poświadczenia znajdują się w pamięci szyfrowanej poświadczeniami (`/data/misc_ce`), zablokowanej do pierwszego odblokowania po ponownym uruchomieniu, więc przed nim nigdy nie są czytelne, inaczej niż `/data/adb`. Aktualizacja modułu przenosi tam stare kopie na stałe (sprawdzając każdą przed usunięciem oryginału) i przetrwają one między reinstalacjami.
- Lokalny cel kopii musi sam pozostać zaszyfrowany w spoczynku: dozwolona jest tylko wewnętrzna i wymienna pamięć użytkownika, nigdy `/data/adb`, `/data/system` ani inne ścieżki czytelne przed pierwszym odblokowaniem, ani przejście `..`. Wymienne SD/USB nie są szyfrowane w spoczynku, więc jesteś ostrzegany (nie blokowany), by włączyć dla nich szyfrowanie kopii.
- Opcjonalna aplikacja towarzysząca Google Drive powinna być zawsze ukryta za pomocą [HMA-OSS](https://github.com/frknkrc44/HMA-OSS), aby nie
  ujawniała roota ani odblokowanego bootloadera.
- Przywracanie działa jako root, więc każde archiwum jest sprawdzane, zanim cokolwiek zostanie
  zapisane: kopia zapasowa, której zawartość wskazuje poza swój cel (ścieżka bezwzględna lub
  komponent `..`), zostaje odrzucona, a żaden plik nie jest wypakowywany, dopóki całe archiwum
  nie przejdzie weryfikacji.
- Każdy prekompilowany plik binarny i biblioteka są możliwe do prześledzenia do przypiętego publicznego
  źródła nadrzędnego z zapisanym SHA-256, a manifest jest dostarczany na urządzeniu, więc dołączony
  ładunek można poddać audytowi i odtworzyć. Zobacz [BINARIES.md](BINARIES.md).

<!-- doc-footer -->

---

> _Ta dokumentacja została wygenerowana za pomocą Claude (Anthropic) i jest utrzymywana przez VD171. Poprawki i ulepszenia są mile widziane; zobacz [CONTRIBUTING.md](CONTRIBUTING.md)._
