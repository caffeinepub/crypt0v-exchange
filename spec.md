# PDF Delivery Chat Bot

## Current State
New project. No existing application files.

## Requested Changes (Diff)

### Add
- A chat-style customer support UI with a bot that greets the customer
- Quick-reply buttons for customer to choose: "Buy PDF" or "Ask a Question"
- When customer clicks "Buy PDF":
  - Bot shows the seller's phone number and KBZ Pay number with payment instructions
  - Customer can upload a payment screenshot (image)
  - Once image is uploaded, bot automatically delivers the PDF file as a download link
- When customer clicks "Ask a Question":
  - A simple text input appears for the customer to type their question
  - Bot responds with a placeholder/acknowledgement message
- PDF file stored in blob storage (uploaded by the owner/admin)
- Admin panel (login-protected) to:
  - Upload the PDF product file
  - Set phone number and KBZ Pay number
  - View list of payment screenshot uploads
- Payment screenshots stored in blob storage

### Modify
N/A — new project

### Remove
N/A — new project

## Implementation Plan
1. Backend (Motoko):
   - Store seller config: phone number, KBZ Pay number, PDF file reference
   - Store list of uploaded payment screenshots (blob refs)
   - Admin functions: setConfig, uploadPDF, listScreenshots
   - Public functions: getConfig (phone/KBZ), submitScreenshot, getPDF (returns download URL after screenshot submitted)
2. Blob storage: store PDF and payment screenshots
3. Frontend:
   - Chat UI with bot messages and quick-reply buttons
   - Buy PDF flow: show payment info → upload screenshot → receive PDF download
   - Ask a Question flow: text input + bot acknowledgement
   - Admin page (password or Internet Identity protected) to upload PDF and set payment details
