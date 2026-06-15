# MemeVault Desktop Suite

MemeVault Desktop Suite is a local-first Electron app for saving, indexing, finding, redacting, lightly editing, and copying memes, reaction images, screenshots, GIFs, and short clips.

## Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run typecheck
npm run test
npm run build
npm run package:mac
npm run package:win
```

## Supported Files

Images: PNG, JPG, JPEG, WEBP  
GIFs: GIF  
Videos: MP4, MOV, WEBM

## Privacy

MemeVault is local-only by default. Originals stay in their folders, generated exports are stored under the Electron user data folder, and the app does not upload files, create accounts, scrape sites, or send analytics.

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

