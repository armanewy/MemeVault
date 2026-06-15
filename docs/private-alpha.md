# Private Alpha Release Checklist

MemeVault private alpha builds are local-first test builds. They are not production-ready.

## Package Commands

Run these from a clean checkout after `npm ci`:

```powershell
npm run typecheck
npm run test
npm run build
npm run package:win
```

On macOS:

```bash
npm run typecheck
npm run test
npm run build
npm run package:mac
```

`npm run package:mac` must run on macOS. Windows cannot build the macOS package target.

## Install Test

1. Install the generated package on a clean test machine or VM.
2. Launch MemeVault.
3. Open Settings and confirm the Alpha section shows version, local data directory, logs directory, privacy note, and alpha warning.
4. Quit and relaunch once before importing media.

## Import Test

1. Create a QA media folder outside the repository.
2. Include `.png`, `.jpg`, `.webp`, `.gif`, `.mp4`, `.mov`, or `.webm` files.
3. Add the folder from onboarding or Settings.
4. Confirm imported assets appear in the grid.
5. Confirm failed thumbnails keep assets visible and jobs report readable errors.

## Palette Test

1. Press `Cmd/Ctrl+Shift+M`.
2. Search for an imported asset by filename.
3. Press `Enter` on an image and paste into another app.
4. Press `Shift+Enter` and confirm paste is attempted outside the palette, never into the palette search box.
5. Select a GIF or video and confirm the message clearly says a file path was copied.

## OCR Test

1. Import an image with a unique visible phrase.
2. Wait for OCR jobs to finish.
3. Search for the unique phrase.
4. Confirm the asset appears in search results.

## Redaction Test

1. Open a receipt or screenshot image with visible sensitive text.
2. Open the redaction workflow.
3. Apply black, blur, or pixelate redactions.
4. Export the redacted asset.
5. Confirm the exported asset imports back into the library and the original is unchanged.

## Caption Export Test

1. Open an image in the caption workflow.
2. Add top and bottom caption text.
3. Export the captioned asset.
4. Confirm the exported asset imports back into the library and displays correctly.

## Quit/Reopen Persistence Test

1. Import several assets.
2. Favorite one asset and add one tag.
3. Quit MemeVault completely.
4. Reopen the packaged app.
5. Confirm imported assets, favorite state, tags, OCR text, and Settings values persist.

## Old DB Migration Test

1. Keep a backup copy of an old alpha database before opening it.
2. Launch the new build against the old database.
3. Confirm the app starts without migration errors.
4. Confirm duplicate columns exist after migration:
   - `duplicate_of_asset_id`
   - `duplicate_status`
5. Confirm `idx_assets_duplicate_status` exists.
6. Confirm default library/search results hide duplicate assets.

