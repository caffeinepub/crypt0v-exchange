# PDF Shop Chat

## Current State
The app stores admin-uploaded PDF files and customer payment screenshots as base64 strings in `localStorage`. This causes:
1. **Black screen crash** when uploading PDF files in the admin panel — large files exceed the ~5MB localStorage quota and the browser crashes/goes black.
2. **View picture failure** in admin panel — payment screenshots stored as base64 in localStorage can't be loaded/viewed reliably and fail when storage is full.

The `blob-storage` Caffeine component is already installed but NOT used. The backend has blob storage methods via the `blob-storage` mixin. The `StorageClient` utility is present in the frontend.

## Requested Changes (Diff)

### Add
- Backend methods to store and retrieve PDF file metadata (hash + filename + name + burmese name + price) on-chain
- Backend methods to store and retrieve payment screenshot metadata (hash + filename + uploadedAt) on-chain
- Backend methods to store/retrieve admin config (phone, kbz pay) on-chain
- Frontend: use `StorageClient` (via `useActor` + `createActorWithConfig`) to upload files to blob storage and get back a hash URL instead of base64
- Frontend: use hash-based blob URLs for both file delivery and screenshot viewing

### Modify
- Admin panel file upload: instead of `toBase64()` → localStorage, use `StorageClient.putFile()` → get hash URL → save to backend
- Customer payment screenshot upload: instead of `toBase64()` → localStorage, use `StorageClient.putFile()` → get hash URL → save to backend  
- `loadAdminConfig()` / `saveAdminConfig()`: replace localStorage with backend actor calls
- Admin screenshots view: load screenshot URLs from backend (blob URLs) so they display correctly
- PDFDownloadCard: works the same since URLs will be proper blob gateway URLs not data: URIs

### Remove
- All `toBase64` usage for file storage purposes
- All localStorage read/write for PDF entries and screenshots
- `loadAdminConfig()` and `saveAdminConfig()` localStorage functions (replace with backend)

## Implementation Plan
1. Update `main.mo` to add:
   - `PdfEntry` type with `name`, `burmeseName`, `price`, `hash`, `fileName`
   - `Screenshot` type with `name`, `hash`, `uploadedAt`, `fulfilled` flag
   - `AdminConfig` type with `phone`, `kbzPay`
   - Stable storage for these (maps keyed by admin principal or single config)
   - Public methods: `getAdminConfig`, `saveAdminConfig`, `getPdfEntries`, `savePdfEntry`, `deletePdfEntry`, `getScreenshots`, `saveScreenshot`, `deleteScreenshot`, `markScreenshotFulfilled`
   - The blob-storage mixin provides `_caffeineStorageCreateCertificate` for uploads
2. Update frontend App.tsx:
   - Add `useActor` hook usage to get actor + StorageClient
   - Replace admin file upload flow: read file → `storageClient.putFile()` → get hash → build blob URL → store in backend
   - Replace screenshot upload flow: same pattern
   - Load config from backend on mount, save to backend on save
   - Admin screenshots section: display using hash-based URLs from blob gateway
   - Keep all chat UX the same; only change the file storage mechanism
