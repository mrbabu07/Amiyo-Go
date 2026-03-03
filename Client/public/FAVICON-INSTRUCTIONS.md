# Favicon Instructions

## Current Status

✅ `favicon.svg` created - Professional shopping bag with "H" logo

## Generate PNG Favicons

### Option 1: Use Online Tool (Recommended)

1. Go to https://realfavicongenerator.net/
2. Upload `favicon.svg`
3. Download the generated package
4. Extract these files to `Client/public/`:
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`
   - `android-chrome-192x192.png`
   - `android-chrome-512x512.png`

### Option 2: Use ImageMagick (Command Line)

```bash
# Install ImageMagick first
# Then run:
convert favicon.svg -resize 16x16 favicon-16x16.png
convert favicon.svg -resize 32x32 favicon-32x32.png
convert favicon.svg -resize 180x180 apple-touch-icon.png
convert favicon.svg -resize 192x192 android-chrome-192x192.png
convert favicon.svg -resize 512x512 android-chrome-512x512.png
```

### Option 3: Temporary Fallback

For now, the SVG favicon will work in modern browsers. PNG versions are recommended for better compatibility.

## Files Needed

- ✅ `favicon.svg` (created)
- ⏳ `favicon-16x16.png` (generate)
- ⏳ `favicon-32x32.png` (generate)
- ⏳ `apple-touch-icon.png` (generate)
- ⏳ `android-chrome-192x192.png` (generate)
- ⏳ `android-chrome-512x512.png` (generate)

## Quick Fix

Until you generate PNG files, update `index.html` to use the SVG:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```
