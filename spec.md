# PDF Shop Chat

## Current State
- Admin panel exists with file upload (PDF/DOCX/etc.) and payment screenshot sections
- File upload uses `StorageClient` which requires ICP authentication — admin is not logged in, so uploads always fail with an error
- Payment screenshots are saved as `{ name, url: 'local-screenshot', uploadedAt }` — the actual image data is not stored, so admin cannot view them
- Screenshots section in admin shows name and timestamp only, no preview/view capability
- All buttons (Save, Add File, Delete, Upload) exist but the upload buttons silently fail due to auth requirement

## Requested Changes (Diff)

### Add
- Base64 file storage: when admin uploads a file, read it as ArrayBuffer, convert to base64 data URL, and store in localStorage (no auth, no backend needed)
- Screenshot viewing: when customer uploads payment screenshot, save the actual base64 image data to the screenshots array; in admin panel show a clickable thumbnail / "View" button that opens the image in a new tab
- Screenshot delete button: allow admin to delete individual screenshots

### Modify
- `handleUploadPdf` (legacy): replace `StorageClient` call with base64 conversion and localStorage storage
- `handleUploadPdfEntry` (multi-PDF): replace `StorageClient` call with base64 conversion and localStorage storage
- `handleFileUpload` in ChatPanel: save actual base64 image data instead of `'local-screenshot'` string
- `PDFDownloadCard`: if URL is a base64 data URL (starts with `data:`), skip the `fetch()` step and create blob directly from it
- Admin screenshots section: show image thumbnail + View button + Delete button for each screenshot
- File upload inputs in admin: accept all document types (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip)

### Remove
- `getStorageClient()` function and `StorageClient` import (no longer needed)
- `HttpAgent` and `loadConfig` imports if only used by getStorageClient

## Implementation Plan
1. Replace file upload logic in admin panel: use `FileReader.readAsDataURL()` to get base64, store directly in localStorage as the `url` field of PdfEntry
2. Fix `PDFDownloadCard.handleDownload`: detect `data:` URLs and convert directly to blob without fetch
3. Fix screenshot capture in `handleFileUpload`: use `FileReader.readAsDataURL()` to capture image as base64, store in screenshots array
4. Update admin screenshots UI: show thumbnail image, a View button (opens base64 in new tab), and a Delete button
5. Remove unused StorageClient/agent imports
6. Validate and build
