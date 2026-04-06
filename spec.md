# PDF Shop Chat

## Current State
The PDF Shop Chat delivers a file after a customer uploads a payment screenshot. Currently, the `handleFileUpload` function auto-triggers a download using `link.click()` immediately when any image is uploaded. The `PDFDownloadCard` component already exists and shows a Download button, but the auto-download also fires simultaneously. The file reference points to the old docx hash (`019d63fb-e630-75a5-a472-b260e63e4fe1`).

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- `handleFileUpload`: Remove the auto-download `link.click()` code block entirely — the file should NOT auto-download when the image is uploaded
- `matchPdf`: Update the investing file path to use the new uploaded file: `houyi_chat_3-019d6438-aef0-7345-979c-109e9a399abf.docx`
- `handleSend` (asking_pdf_type branch): Update fallback file path to use the new file
- The `PDFDownloadCard` download button is already correct — clicking it downloads the file. No change needed there.

### Remove
- Auto-download code in `handleFileUpload` (the `document.createElement('a') / link.click()` block)

## Implementation Plan
1. In `matchPdf`, change the hardcoded investing file path from `019d63fb-e630-75a5-a472-b260e63e4fe1.docx` to `019d6438-aef0-7345-979c-109e9a399abf.docx`
2. In `handleSend` (asking_pdf_type branch), update the fallback path to the new file
3. In `handleFileUpload`, remove the auto-download block (the `link.createElement/click` section)
4. Ensure `selectedPdfUrl` is properly set so `PDFDownloadCard` receives the correct URL for the download button
