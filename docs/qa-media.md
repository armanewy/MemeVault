# QA Media Folder

Use this when checking the import/search/copy loop with local media.

## Manual Folder

Create a temporary folder outside the repository, for example:

```powershell
New-Item -ItemType Directory -Force C:\MemeVault-QA-Media\Images
New-Item -ItemType Directory -Force C:\MemeVault-QA-Media\Gifs
New-Item -ItemType Directory -Force C:\MemeVault-QA-Media\Videos
```

Add a small mix of supported files:

- `.png`
- `.jpg`
- `.jpeg`
- `.webp`
- `.gif`
- `.mp4`
- `.mov`
- `.webm`

For OCR verification, include one PNG screenshot-style image with a unique phrase such as `MEMEVAULT QA OCRTEST ALPHA ZEBRA`.

## App Check

1. Run `npm run dev`.
2. In onboarding or Settings, add the QA folder as a watched folder.
3. Wait for background jobs to settle.
4. Confirm files appear in the grid.
5. Search by filename.
6. Search by the unique OCR phrase.
7. Open the palette with `Cmd/Ctrl+Shift+M`.
8. Press `Enter` on an image result and paste into another app.
9. Press `Shift+Enter` and confirm it does not paste into the palette.
10. Select a GIF or video and confirm the message says a file path was copied.

## Manifest Test

The optional integration test reads a manifest created during manual QA:

```powershell
$env:MEMEVAULT_QA_MANIFEST='C:\path\to\memevault-qa-media-manifest.json'
npx vitest run tests/mediaDetection.e2e.test.ts --reporter=verbose
```

The test is skipped during normal `npm run test` unless `MEMEVAULT_QA_MANIFEST` is set.
