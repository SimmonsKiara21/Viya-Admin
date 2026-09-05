# ViyaAdmin.com

Staff desk for **Viya Academy + Agency** in Phoenix, branded as **ViyaAdmin.com**. Look up a student, see their photo and file, take class check-in, track Square balances, and send a text or Gmail — without bouncing between spreadsheets.

The 2026 enrollment workbook, subscriber list, photoshoot flags, and the August 26 Jotform attendance tracker are loaded as the starting roster. Attendance after that comes from Jotform.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

Photos, Jotform, Square, and enrollment sync in the background without rewriting the whole roster on every poll. Uploaded photos are compressed and stored separately from the main desk save. Season 1–5 photoshoot folders are matched onto the roster by name; those portraits live in `public/photos` so they load on the desk without a Drive login. Only people already on the enrollment list get a portrait.

```bash
npm run build
npm start
```

## What you can do

- **Add a student** as **Academy**, **Modeling**, **Acting**, or **Subscriber**, with their **DocuSign** envelope, signing link, and status. Open **DocuSign** in the sidebar to see who still needs to sign.
- **Welcome lock:** the desk opens on a locked welcome screen. Password is `viyatalent`. Use **Lock desk** in the sidebar when you leave the floor.
- **Upload a photo** on the profile (tap the portrait). Staff uploads stay in this browser. Matching portraits from the Season 1–5 Drive photoshoot folders are already on the roster.
- **Check-in** is the only place to manually check someone in (Modeling, Acting, or Subscriber). Staff check-ins post to the Jotform attendance tracker. Student-phone check-ins on that form sync back to **Attendance**.
- **Attendance** is the Jotform record. The August 26 class from the tracker is loaded; earlier nights were not kept because the desk did not have those check-ins yet.
- **Payments** is a Square tracker for **enrollment students only**. The desk pulls invoices every couple of minutes. With `SQUARE_ACCESS_TOKEN` those are live Square invoices (due dates, paid, balance). Without a token it uses the last dashboard snapshot in `data/square.json`. People who are on Square but not on the 2026 enrollment workbook are not added. Each row shows the Square item (VA101 training, Viya Talent Subscription, OG, Model Source, cancellation fee) with that item's description, plus amount, paid, and balance.
- **Subscriptions** uses the Square subscriber item copy: *Your Potential Unlocked - Anytime, All the Time…*
- **Students** is the current enrollment tab (academy + subscribers). **Pending** is only people the enrollment workbook marks pending.
- **Contacts** is everyone else — photoshoot lists, inquiries, follow-ups. Categorize them there, or move someone to pending if they actually enroll.
- **Notify** has separate groups for **Current students**, **Academy overdue**, **Subscriber overdue**, and **Subscribers**. Click several students in the list (or **Add all shown**) then save them as a custom group. Texts send from the academy **Textla** number when `TEXTLA_WEBHOOK_URL` and `TEXTLA_FROM_NUMBER` are set.
- **Photoshoots** is monthly. September and October start empty with the same lists (Scheduled, Headshots, Full, Refresh, Received). Prior months (May, June, July, August) sit in a dropdown.
- **Alerts** has a prefilled payment reminder with **Text all** and **Email all** for overdue students.
- **Themes:** Dark, Sepia, and Light from the switcher in the bottom right. Sepia is kraft cocoa (brown paper, umber ink), not cream or yellow.
- **Times** on Check-in and Attendance are **Arizona (Phoenix, MST)**. Arizona does not use daylight saving.

## Alerts

- **Academy overdue / declined** — red, with the payment due date. **Text academy overdue** / **Email academy overdue** on Alerts goes to this list.
- **Subscriber overdue** — orange, kept separate from academy and training follow-up. **Text subscriber overdue** / **Email subscriber overdue** goes to this list.
- **Collections** — amber, kept separate from a regular overdue follow-up.
- **Paused** — violet, so the desk does not check them in by accident.
- **Pending** — blue, so DocuSign, deposit, and first class stay visible.
- **Fewer than 3 payments** — lime, for current academy payment-plan students who **started May 2026 or earlier** and have **fewer than 3 installments left**. Remaining payments come from the Square invoice (balance vs plan) when we have one, otherwise from the 6-payment start date. May 2026 starters currently have 3 left until the next installment posts, so they highlight once they drop to 2.
- **Paid in full** — emerald. The enrollment workbook usually leaves STATUS as Current and marks **PAYMENT PLAN = PIF**. The desk treats that as paid in full and highlights them. Pending or collections still keep those markers first.

Staff see a banner on every page with those counts. Names are highlighted in the same colors on every roster list.

## Class reminders

Academy classes are always:

- Wednesday 7:30–8:30pm
- Saturday 4:00–5:00pm (Phoenix)

Send the weekly reminder from **Classes** or **Notify**. Subscriber class times are pulled from [Talent Resources](https://www.viyatalent.com/talentresources) when that page is reachable.

Enrollment / payment: **Current**, **Pending**, **Declined**, **PIF / Paid in Full**, plus Overdue, Paused, and Collections so the desk matches how the academy already works.

## Square, enrollment, Gmail, and texts

Enrollment stays in sync with the published Google Sheet (Current Students, Pending, Subscriptions, and Collections). The desk pulls that sheet in the background whenever it changes. Upload a CSV or Excel from **Home** or **Students** only if you need a manual override. Square then overlays invoice due dates.

Google Contacts lists (Current Student, Active Subscribers, May photoshoot, LA Model Source 2026, Model Source November) overlay people already on the enrollment workbook. Anyone on that export who is not on the workbook is added to **Contacts** in that list — not to Students.

Payments use Square invoices. Live API keys are optional — without them the desk still overlays due dates from `data/square.json`. With `SQUARE_ACCESS_TOKEN` (Invoices Read + Customers Read) the desk pulls production invoices and writes the correct due date, amount, and remaining installments onto enrollment students only.

The desk works without API keys. Copy `.env.example` to `.env.local` and add credentials when you want live send/sync:

| Service | Variables |
| --- | --- |
| Square invoices | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT=production` |
| Enrollment sheet | `ENROLLMENT_CSV_URL` (published Google Sheet CSV), optional `ENROLLMENT_WEBHOOK_SECRET` |
| Textla texts | `TEXTLA_WEBHOOK_URL` (Zapier Catch Hook → Textla Send Message), `TEXTLA_FROM_NUMBER` |
| Jotform attendance | `JOTFORM_API_KEY` (or a webhook to `/api/jotform/webhook`) |
| Gmail | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| Textla or Twilio | `TEXTLA_API_KEY` or `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` |

The student attendance tracker is [this Jotform](https://form.jotform.com/262377942791167). Staff check-ins on the desk are posted there. Student-phone check-ins come back to Attendance when you add a Jotform webhook to `/api/jotform/webhook` or an API key.

Edits (notes, statuses, check-ins, photos) are saved in this browser so the floor can keep working offline. They are not a replacement for Square itself.

Public site: [viyatalent.com](https://www.viyatalent.com) · Talent resources: [viyatalent.com/talentresources](https://www.viyatalent.com/talentresources)
