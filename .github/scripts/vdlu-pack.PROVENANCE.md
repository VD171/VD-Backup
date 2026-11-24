# vdlu-pack (vendored, keyless)

Byte-identical copy of the canonical [VDLiveUpdate](https://github.com/VD171/VDLiveUpdate) (VDLU) producer `vdlu-pack`, vendored so the
github CI can generate per-variant `vdlu/baseline.json` (the install "from:0" seed)
**without any private key** - `vdlu-pack` only hashes + gzips, it never signs.

- Source   : VD/Sources/VDLiveUpdate/producer/vdlu-pack
- Commit    : 08dfab4f5f554621ca8442f3eeec66f5f523ccc7
- sha256    : be873f9a4064750b54ff4cd30bcea820f475ae1dde692f1a7192cff7266f4e00
- Stdlib-only (argparse, hashlib, json, os, shutil, subprocess, sys); no local imports.

The signed FEED (for the Pages site) is still produced + signed on the release
operator's machine with the private key; only the keyless baseline runs in CI.
Resync this file (and the sha above) whenever the canonical `vdlu-pack` changes.

generated with Claude
