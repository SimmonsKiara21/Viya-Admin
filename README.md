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

- **Add a student** with their **DocuSign** envelope, signing link, and status. Open **DocuSign** in the sidebar to see who still needs to sign.
- **Welcome lock:** the desk opens on a locked welcome screen. Password is `viyatalent`. Use **Lock desk** in the sidebar when you leave the floor.
- **Upload a photo** on the profile (tap the portrait). Photos stay in this browser.
- **Check-in** for Modeling, Acting, or Subscriber. Attendance is counted separately for modeling and acting.
- **Payments** is a Square tracker for **enrollment students only**. Invoices and subscriptions from the Square dashboard are matched by name. People who are on Square but not on the 2026 enrollment workbook are not added. Each row shows the Square item (VA101 training, Viya Talent Subscription, OG, Model Source, cancellation fee) with that item's description, plus amount, paid, and balance.
- **Subscriptions** uses the Square subscriber item copy: *Your Potential Unlocked - Anytime, All the Time…*
- **Student Payments** on a profile shows the Square payment schedule (due dates, amounts, paid, status) plus invoice copy.
- **Notify** has separate groups for **Current students**, **Overdue students**, and **Subscribers**. Click several students in the list (or **Add all shown**) then save them as a custom group.
- **Photoshoots** lets you add, move, or remove people on that tab — search, tap a name, or use the dropdown next to each person.
- **Alerts** has a prefilled payment reminder with **Text all** and **Email all** for overdue students.
- **Themes:** Dark, Sepia, and Light from the switcher in the bottom right.

## Alerts

- **Overdue / declined** — red, with the payment due date. **Text all** / **Email all** on Alerts goes to this list.
- **Collections** — amber, kept separate from a regular overdue follow-up.
- **Paused** — violet, so the desk does not check them in by accident.
- **Pending** — blue, so DocuSign, deposit, and first class stay visible.
- **Wrapping up** — teal, for current payment-plan students with **3 or fewer payments left** who have checked in across **at least two months**.

Staff see a banner on every page with those counts. Names are highlighted in the same colors on every roster list.

## Class reminders

Academy classes are always:

- Wednesday 7:30–8:30pm
- Saturday 4:00–5:00pm (Phoenix)

Send the weekly reminder from **Classes** or **Notify**. Subscriber class times are pulled from [Talent Resources](https://www.viyatalent.com/talentresources) when that page is reachable.

Enrollment / payment: **Current**, **Pending**, **Declined**, **PIF / Paid in Full**, plus Overdue, Paused, and Collections so the desk matches how the academy already works.

## Square, Gmail, and texts

Payments use Square invoices pulled from the logged-in dashboard and kept in `data/square.json`. Live API keys are optional.

The desk works without API keys. Copy `.env.example` to `.env.local` and add credentials when you want live send/sync:

| Service | Variables |
| --- | --- |
| Square | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT` |
| Gmail | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| Textla or Twilio | `TEXTLA_API_KEY` or `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` |

Edits (notes, statuses, check-ins, photos) are saved in this browser so the floor can keep working offline. They are not a replacement for Square itself.

Public site: [viyatalent.com](https://www.viyatalent.com) · Talent resources: [viyatalent.com/talentresources](https://www.viyatalent.com/talentresources)
