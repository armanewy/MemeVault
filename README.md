# MemeVault Desktop Suite

MemeVault Desktop Suite is a local-first Electron app for saving, indexing, finding, redacting, lightly editing, and copying memes, reaction images, screenshots, GIFs, and short clips.

## Development

```bash
npm install
npm run dev
```

Verified commands for this MVP:

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run dev
```

CI uses:

```bash
npm ci
npm run typecheck
npm run test
npm run build
```

## Supported Files

Images: PNG, JPG, JPEG, WEBP  
GIFs: GIF  
Videos: MP4, MOV, WEBM

## Privacy

MemeVault is local-only by default. Originals stay in their folders, generated exports are stored under the Electron user data folder, and the app does not upload files, create accounts, scrape sites, or send analytics.

## Current MVP Status

The current build is focused on the core loop:

1. Import or watch local folders.
2. Index supported assets into SQLite.
3. Generate thumbnails and OCR text in background jobs.
4. Search from the library or global palette.
5. Press `Enter` to copy image assets.
6. Press `Shift+Enter` to hide the palette, wait briefly, and attempt paste into the previously focused app.

Search supports filename, OCR text, tags, collections, `kind:image`, `kind:gif`, `kind:video`, `tag:<name>`, and `fav:true`.

GIF and video clipboard behavior is explicit in this MVP: MemeVault copies the file path and shows a clear message. GIFs are not silently flattened to still images.

## QA Media

Manual QA media setup is documented in [docs/qa-media.md](docs/qa-media.md). The optional manifest-backed media detection test is skipped unless `MEMEVAULT_QA_MANIFEST` is set.

## Known Limitations

- Auto-paste may require macOS Accessibility permission.
- GIF clipboard support varies by target app.
- OCR accuracy depends on image quality.
- Video caption export is best effort in the MVP.
- App is local-only; no cloud sync.
- FFmpeg is bundled through `ffmpeg-static`; codec support depends on that binary.

## Troubleshooting

- If a file was moved or deleted, MemeVault keeps its metadata and marks it missing.
- Use Settings -> Clear thumbnails/cache to regenerate previews.
- Use Settings -> Open logs folder for readable job and service errors.
