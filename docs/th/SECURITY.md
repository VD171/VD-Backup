> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · ไทย · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# นโยบายความปลอดภัย

VDBackup ทำงานในฐานะ root และจัดการข้อมูลของคุณ รวมถึง (ถ้าเลือก) credential และ
วลีรหัสผ่าน (passphrase) สำหรับการเข้ารหัสของคุณ เราให้ความสำคัญกับความปลอดภัยอย่างจริงจัง

## การรายงานช่องโหว่

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (เฉพาะรายงานที่ไม่เกี่ยวกับความปลอดภัยเท่านั้น)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

โปรดระบุคำอธิบายที่ชัดเจน และถ้าทำได้ ขั้นตอนการทำซ้ำปัญหา เราจะตอบกลับโดยเร็วที่สุด
เท่าที่จะทำได้ และให้เครดิตคุณหากคุณต้องการ

## หมายเหตุขอบเขต

- credential และ passphrase ถูกจัดเก็บแบบเข้ารหัสในขณะพัก (at rest) และไม่เคยถูกเขียน
  เป็นข้อความธรรมดา backup ไม่เคยผูกกับคีย์ฮาร์ดแวร์ที่ผูกกับอุปกรณ์ (เพื่อให้ยังคง
  พกพาได้) ซึ่งก็หมายความว่า passphrase คือสิ่งที่ปกป้อง backup ที่เข้ารหัส -
  จงเลือก passphrase ที่แข็งแรง
- แอปคู่หู Google Drive ซึ่งเป็นตัวเลือกเสริม ควรถูกซ่อนด้วย HMA-OSS เสมอ เพื่อไม่ให้
  มันเปิดเผยว่ามี root หรือ bootloader ที่ปลดล็อก
- การกู้คืนทำงานในฐานะ root ดังนั้นทุก archive จะถูกตรวจสอบก่อนที่จะมีการเขียนสิ่งใด: backup
  ที่เนื้อหาชี้ไปนอกเป้าหมายของมัน (path แบบสัมบูรณ์หรือองค์ประกอบ `..`) จะถูกปฏิเสธ และจะไม่มี
  ไฟล์ใดถูกแตกออกจนกว่าทั้ง archive จะผ่านการตรวจสอบ
- ทุก binary และ library ที่คอมไพล์มาล่วงหน้าสามารถตามรอยไปยัง upstream สาธารณะที่ตรึงไว้ซึ่งมี SHA-256
  ที่บันทึกไว้ และ manifest ถูกแนบมาบนอุปกรณ์ ดังนั้น payload ที่รวมมาจึงสามารถตรวจสอบและทำซ้ำได้
  ดู [BINARIES.md](BINARIES.md)

*เอกสารนี้สร้างขึ้นด้วย Claude (Anthropic) และดูแลโดย VD171 ยินดีรับการแก้ไขและปรับปรุง - ดู [CONTRIBUTING.md](CONTRIBUTING.md)*
