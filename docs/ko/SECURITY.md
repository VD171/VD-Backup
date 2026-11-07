> **Languages:** [English](../../SECURITY.md) · [العربية](../ar/SECURITY.md) · [Čeština](../cs/SECURITY.md) · [Deutsch](../de/SECURITY.md) · [Español](../es/SECURITY.md) · [فارسی](../fa/SECURITY.md) · [Français](../fr/SECURITY.md) · [हिन्दी](../hi/SECURITY.md) · [Bahasa Indonesia](../in/SECURITY.md) · [Italiano](../it/SECURITY.md) · [日本語](../ja/SECURITY.md) · 한국어 · [Nederlands](../nl/SECURITY.md) · [Polski](../pl/SECURITY.md) · [Português](../pt/SECURITY.md) · [Русский](../ru/SECURITY.md) · [Svenska](../sv/SECURITY.md) · [ไทย](../th/SECURITY.md) · [Türkçe](../tr/SECURITY.md) · [Tiếng Việt](../vi/SECURITY.md) · [中文](../zh/SECURITY.md)

---

# 보안 정책

VDBackup은 root로 실행되며 사용자의 데이터와 (선택적으로) 자격 증명 및
암호화 암호문구를 다룹니다. 우리는 보안을 진지하게 여깁니다.

## 취약점 신고

- **Site:** https://vd171.ru
- **Site:** https://vd.priv8.ru
- **Issues:** https://github.com/VD171/VD-Backup/issues (보안 외 신고만)
- **GitHub:** [@VD171](https://github.com/VD171)
- **XDA-Developers:** [@VD171](https://xdaforums.com/m/vd171.4699873/)
- **XDA thread:** https://xdaforums.com/t/VD-Backup.4807267/
- **Telegram:** [@VD_Priv8](https://t.me/VD_Priv8)
- **Telegram:** [@Priv8_VD](https://t.me/Priv8_VD)
- **Discord:** [@VD.Priv8](https://discord.com/users/1296831918989639721)
- **E-mail:** vd.priv8@pm.me

명확한 설명과, 가능하면 재현 단계를 포함하세요. 가능한 한 빨리 응답하고
원하시면 공로를 인정해 드리겠습니다.

## 범위 참고사항

- 자격 증명과 암호문구는 저장 시 암호화되며 평문으로 기록되지 않습니다.
  백업은 장치에 묶인 하드웨어 키에 절대 연결되지 않으므로(그래서 이식성이
  유지됨), 이는 곧 암호화된 백업을 보호하는 것이 암호문구라는 뜻입니다 -
  강력한 것을 선택하세요.
- 선택적 Google Drive 동반 앱은 root나 잠금 해제된 부트로더를 드러내지 않도록
  항상 HMA-OSS로 숨겨야 합니다.
- 복원은 root로 실행되므로, 무언가가 기록되기 전에 모든 아카이브가 검사됩니다. 내용이
  대상 밖을 가리키는 백업(절대 경로나 `..` 구성 요소)은 거부되며, 전체 아카이브가 통과될
  때까지 어떤 파일도 추출되지 않습니다.
- 모든 사전 빌드된 바이너리와 라이브러리는 기록된 SHA-256과 함께 고정된 공개 업스트림까지 추적할 수 있으며,
  매니페스트가 기기에 함께 제공되므로 번들된 페이로드를 감사하고 재현할 수 있습니다.
  [BINARIES.md](BINARIES.md)를 참조하세요.

*이 문서는 Claude (Anthropic)로 생성되었으며 VD171이 관리합니다. 수정과 개선을 환영합니다 - [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.*
