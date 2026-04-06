# PDF Shop Chat

## Current State
- Chat starts in English by default, with a Myanmar language toggle
- Bot messages are short/terse
- When customer types a PDF name, the bot immediately proceeds to payment info without confirming which file was found
- After payment screenshot upload, the PDF is released but no warm thank-you or come-back message is shown
- No special handling for 'investing one' or 'ရင်းနှီးမြုပ်နှံခြင်း တစ်' keywords
- The uploaded DOCX file is already in public/assets but not registered in adminConfig as a PDF

## Requested Changes (Diff)

### Add
- Default language is Myanmar (mm) on first load, not English
- Special keyword matching: when customer types 'investing one' or 'ရင်းနှီးမြုပ်နှံခြင်း တစ်' (case-insensitive, trimmed), automatically match and use the uploaded DOCX file (houyi_chat_3-019d63fb-e630-75a5-a472-b260e63e4fe1.docx)
- After customer types which PDF they want, show a preview/confirmation card with the file name and ask 'Is this the file you are looking for?' before proceeding to payment
- New chat step: 'confirming_pdf' between 'asking_pdf_type' and 'payment_info'
- After upload completes, bot sends a warm, friendly multi-sentence thank-you message inviting the customer to come back
- Myanmar + English translations for the new confirmation and thank-you messages

### Modify
- All bot messages throughout the flow should be warm, friendly, and multi-sentence (not short/terse)
- Default lang state changed from 'en' to 'mm'
- Greeting message should be warm and welcoming (multi-sentence)
- matchPdf must also check for the special investing keywords and return the DOCX URL
- After confirmation 'yes', proceed to show payment details
- If customer says 'no' at confirmation step, ask them to try a different name
- Upload zone text should also be in Myanmar by default

### Remove
- Nothing removed

## Implementation Plan
1. Change default lang from 'en' to 'mm'
2. Expand T (translations) object with richer, warmer messages for all bot turns in both languages
3. Add 'confirming_pdf' step to ChatStep type
4. Add state for 'pendingPdfEntry' (name + url) to display in confirmation card
5. Add PDFConfirmationCard component showing the matched file name with Yes/No buttons
6. Update handleSend to: after matching PDF, set step to 'confirming_pdf' and show confirmation card
7. Add handleConfirmYes and handleConfirmNo handlers
8. Add special keyword matching in matchPdf for 'investing one' / 'ရင်းနှီးမြုပ်နှံခြင်း တစ်' that returns the path to the DOCX asset
9. Update handleFileUpload success handler to send a warm multi-sentence thank-you message
10. Update all existing T strings to be warmer and friendlier
