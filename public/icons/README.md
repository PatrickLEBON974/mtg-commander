# PWA Icons

Generate the following icons from `src/assets/icons/ui/logo.svg`:

- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

You can use a tool like Inkscape, ImageMagick, or an online SVG-to-PNG converter:

```bash
# Example with Inkscape
inkscape src/assets/icons/ui/logo.svg -w 192 -h 192 -o public/icons/icon-192x192.png
inkscape src/assets/icons/ui/logo.svg -w 512 -h 512 -o public/icons/icon-512x512.png

# Example with ImageMagick
convert -background none src/assets/icons/ui/logo.svg -resize 192x192 public/icons/icon-192x192.png
convert -background none src/assets/icons/ui/logo.svg -resize 512x512 public/icons/icon-512x512.png
```
