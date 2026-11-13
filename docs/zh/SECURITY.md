> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · [한국어](../ko/SECURITY.md) · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Українська](../uk/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · 中文

---

# 安全策略

VDBackup 以 root 身份运行，并处理你的数据，以及（可选的）你的凭据和
加密口令。我们认真对待安全。

## 报告漏洞

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

请包含清晰的描述，并尽可能附上复现步骤。我们会尽快回复，
并在你愿意的情况下署名致谢。

## 范围说明

- 凭据和口令在静态存储时均加密，绝不以明文写入。备份绝不
  与设备绑定的硬件密钥关联（因此它们保持可移植），这也意味着
  口令是保护加密备份的东西, 请选择一个强口令。
- 这些凭据存放在凭据加密存储（`/data/misc_ce`）中，重启后在首次解锁前保持锁定，因此与 `/data/adb` 不同，在该解锁之前绝不可读。模块更新会将旧副本永久移动到那里（在删除原件前逐一校验），并在重装之间保留。
- 本地备份目标本身必须在静态下保持加密：仅允许内部和可移动的用户存储，绝不允许 `/data/adb`、`/data/system` 或其他首次解锁前可读的路径，也不允许 `..` 穿越。可移动 SD/USB 在静态下完全不加密，因此会警告你（而非阻止）为其开启备份加密。
- 可选的 Google Drive 配套应用应始终用 [HMA-OSS](https://github.com/frknkrc44/HMA-OSS) 隐藏，以免它
  暴露 root 或已解锁的 bootloader。
- 恢复以 root 身份运行，因此在写入任何内容之前都会检查每个归档：内容指向其目标之外的备份
  （绝对路径或 `..` 组件）会被拒绝，并且在整个归档通过检查之前不会解压任何文件。
- 每个预编译的二进制文件和库都可追溯到一个固定的公共上游，并带有记录的 SHA-256，且清单随设备一同提供，
  因此捆绑的有效负载可以被审计和复现。参见 [BINARIES.md](BINARIES.md)。

<!-- doc-footer -->

---

> _本文档由 Claude (Anthropic) 生成，并由 VD171 维护。欢迎修正和改进；请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。_
