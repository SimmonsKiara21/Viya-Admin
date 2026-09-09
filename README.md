# ViyaAdmin.com

Staff desk for **Viya Academy + Agency** in Phoenix, branded as **ViyaAdmin.com**. Look up talent, see their photo and file, take class check-in, and track Square balances — without bouncing between spreadsheets.

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

- **Add talent** as **Academy**, **Modeling**, or **Acting**, with their **DocuSign**. Subscribers stay on **Subscriptions**. Open **DocuSign** in the sidebar to see who still needs to sign.
- **Welcome lock:** the desk opens on a locked welcome screen. Password is `viyatalent`. Use **Lock desk** in the sidebar when you leave the floor.
- **Upload a photo** on the profile (tap the portrait). Staff uploads stay in this browser. Matching portraits from the Season 1–5 Drive photoshoot folders are already on the roster.
- **Attendance** is check-in and the roll call in one place. Type a name to check in (Modeling, Acting, or Subscriber). Today and past nights sit on the same page. Staff check-ins post to the Jotform tracker; student-phone check-ins come back from that sheet.
- **Home** is a summary: today’s Phoenix time plus counts for Talent, Overdue, Collections, Sub overdue, and Pending. The alert name lists live on **Alerts**.
- **Payments** on a talent file is their payment schedule from Square (and any extra rows you add). The Payment tracker uses the same short labels — modeling and acting training, sub, or collections — with a notes column. There is no open-balance total on that page.
- **Subscriptions** has three Square plans: standard ($49.99), OG ($4.99), and the $100 plan (Scarlett Petroff). All three share the same Square description.
- **Talent** is the academy roster (modeling and acting included). Subscribers are not counted here — they are on **Subscriptions**. **Pending** is academy starts that have not begun.
- **Contacts** is everyone else. People who are not enrolled have no status tag unless you pick one from the dropdown (blank is allowed). Enrolled people are tagged **Current Student**.
- **Calendar** lists who is supposed to run on each Phoenix date. On a talent file (Payments tab) add the whole schedule as multiple date + amount rows. Those dates show on Calendar and on Alerts when late.
- **Photoshoots** is monthly. Headshots, Refresh, and Received stack together; Scheduled and Full sit beside them. Prior months sit under Prior shoots.
- **Alerts** lists overdue, collections, pending, wrapping up, and paid in full. Texts go out from the separate messaging site, not this desk.
- **Themes:** Dark, Sepia, and Light from the switcher in the bottom right. Light is white with dark text. Sepia is tan paper, espresso ink, and a darker walnut sidebar.
- **Times** on Attendance are **Arizona (Phoenix, MST)**. Arizona does not use daylight saving.

## Alerts

- **Overdue** — red. Workbook OVERDUE plus notes that say a payment was declined. One list.
- **Sub overdue** — orange. Subscribers only.
- **Collections / cancelling** — amber. Kept off the overdue list.
- **Paused** — violet, so the desk does not check them in by accident.
- **Pending** — blue, so DocuSign, deposit, and first class stay visible.
- **Fewer than 3 payments** — lime, for current academy payment-plan students who **started May 2026 or earlier** and have **fewer than 3 installments left**. Remaining payments come from the Square invoice (balance vs plan) when we have one, otherwise from the 6-payment start date. May 2026 starters currently have 3 left until the next installment posts, so they highlight once they drop to 2.
- **Paid in full** — emerald. The enrollment workbook usually leaves STATUS as Current and marks **PAYMENT PLAN = PIF**. The desk treats that as paid in full and highlights them. Pending or collections still keep those markers first.

Staff see a banner on every page with those counts. Names are highlighted in the same colors on every roster list. The **color key** under the header shows what each color means; tap it for the short guide.

## Class schedule

Academy classes are always:

- Wednesday 7:30–8:30pm
- Saturday 4:00–5:00pm (Phoenix)

Subscriber class times are pulled from [Talent Resources](https://www.viyatalent.com/talentresources) when that page is reachable.

Status tags: **Current**, **Pending**, **Overdue**, **Paused**, **Collections**, **Cancelling**, **Paid in full**. Staff can change status and labels on the student file.

## Square, enrollment, Gmail, and texts

The desk is the roster. Add and edit students here — including status tags and labels. Overdue is workbook OVERDUE plus declined-card notes. Collections and cancelling stay separate. Square invoices stay on Payments and do not flip a current student overdue.

Google Contacts lists land in their matching place: **Current Student** on Students, **Active Subscribers** on Subscriptions, and the photoshoot / Model Source lists on Photoshoots and Contacts. The full export — including Newsletter — is on **Contacts** with name, phone, email, and notes.

Payments use Square invoices. Live API keys are optional — without them the desk still shows invoices from `data/square.json`. With `SQUARE_ACCESS_TOKEN` (Invoices Read + Customers Read) the desk pulls production invoices, including installment due dates, onto each talent file and the Payment tracker. Desk schedules (date + amount on a talent file) also land on Calendar and Alerts.

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
