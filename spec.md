# PDF Shop Chat

## Current State
- Admin panel has multi-PDF management: each entry has English name, Burmese name, file URL
- PdfEntry interface does NOT have a price field
- Payment info card shows hardcoded '1,500 MMK' price
- Screenshots section exists: shows thumbnail + View button + Delete
- File matching uses adminConfig.pdfs to find by name/burmeseName
- Legacy single PDF fallback still exists

## Requested Changes (Diff)

### Add
- `price` field to `PdfEntry` interface (e.g. "1,500 MMK")
- Price input field in admin panel for each PDF entry
- Display per-file price in PaymentInfoCard and chat flow (replace hardcoded 1,500 MMK)
- Larger, more visible payment screenshot section in admin panel (bigger thumbnails, scrollable grid)
- "Download" button for each screenshot in admin panel so admin can save it locally
- Per-file price shown in chat confirmation message and payment card

### Modify
- PaymentInfoCard to receive and display the specific file's price (from PdfEntry.price or fallback 1,500 MMK)
- Chat flow: when file is confirmed, show the file's own price in the payment messages
- Admin panel screenshot section: improve layout with larger thumbnails (64x64 or more), full-width grid
- File matching logic: ensure exact name match is returned (already works, just verify)
- Remove legacy single-PDF upload section (confusing, replaced by multi-PDF)

### Remove
- Legacy single PDF upload section from admin panel (the "Legacy PDF File (Fallback)" section)

## Implementation Plan
1. Add `price` field to `PdfEntry` interface
2. Add price input in admin panel per-entry form
3. Update `matchPdf` return value to include the file's price
4. Pass per-file price through chat flow to PaymentInfoCard and payment messages
5. Update PaymentInfoCard to show dynamic price
6. Improve screenshots section: larger thumbnails, grid layout, Download button
7. Remove legacy PDF section
8. Auto-save entries when file is uploaded (already done, verify)
