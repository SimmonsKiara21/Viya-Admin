# Viya Academy Desk

Staff desk for **Viya Academy + Agency** in Phoenix. Look up a student, see their photo and file, take class check-in, track Square balances, and send a text or Gmail — without bouncing between spreadsheets.

The 2026 enrollment workbook, subscriber list, photoshoot flags, and August 26 attendance tracker are loaded as the starting roster.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

```bash
npm run build
npm start
```

## What you can do

- **Look up a student** from the search bar on every page (name, ID, phone, or email). Their profile has a photo, contact buttons, enrollment status, notes, and class feedback.
- **Upload a photo** on the profile (tap the portrait). Photos stay in this browser.
- **Check-in** for Modeling, Acting, or Subscriber. Attendance is counted separately for modeling and acting.
- **Payments** lists Square-style invoices with Current / Pending / Declined / PIF plus Overdue, Paused, and Collections from the workbook.
- **Subscriptions** and **Photoshoots** are their own tabs.
- **Notify** sends a text or Gmail. For one student, your phone or mail app opens with the message filled in. Group sends are stored in the outbox.

## Overdue and wrapping-up alerts

- Overdue, declined, and collections students are highlighted in **red** with the payment due date. Staff see a banner on every page. **Alert overdue students** texts each of them with amount and due date.
- Current payment-plan students with **3 or fewer payments left** who have checked in across **at least two months** are highlighted in **teal**.

## Class reminders

Academy classes are always:

- Wednesday 7:30–8:30pm
- Saturday 4:00–5:00pm (Phoenix)

Send the weekly reminder from **Classes** or **Notify**. Subscriber class times are pulled from [Talent Resources](https://www.viyatalent.com/talentresources) when that page is reachable.

Enrollment / payment: **Current**, **Pending**, **Declined**, **PIF / Paid in Full**, plus Overdue, Paused, and Collections so the desk matches how the academy already works.

## Square, Gmail, and texts

The desk works without API keys. Copy `.env.example` to `.env.local` and add credentials when you want live send/sync:

| Service | Variables |
| --- | --- |
| Square | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT` |
| Gmail | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| Textla or Twilio | `TEXTLA_API_KEY` or `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` |

Edits (notes, statuses, check-ins, photos) are saved in this browser so the floor can keep working offline. They are not a replacement for Square itself.

Public site: [viyatalent.com](https://www.viyatalent.com) · Talent resources: [viyatalent.com/talentresources](https://www.viyatalent.com/talentresources)
