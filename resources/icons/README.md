# Icons

Before the first packaged release, drop platform icons into this folder:

- `icon.ico` — Windows (multi-size, 16 → 256 px)
- `icon.png` — Linux (512×512)
- `icon.icns` — macOS (all sizes)

Quick pipeline:

```bash
# Start from a 1024×1024 source PNG:
magick icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
magick icon-1024.png -resize 512x512 icon.png
# macOS:
iconutil -c icns icon.iconset
```
