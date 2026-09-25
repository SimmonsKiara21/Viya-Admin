# ViyaAdmin.com

Staff desk for **Viya Academy + Agency** in Phoenix, branded as **ViyaAdmin.com**. Look up talent, see their photo and file, take class check-in, and track Square balances — without bouncing between spreadsheets.

The 2026 enrollment roster is native on the desk (notes, due dates, and payment plans included). Attendance after August 26 comes from Jotform. Square invoices still refresh in the background.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

Photos, Jotform, and Square sync in the background. Enrollment is already on the website and is not re-pulled from Google. Uploaded photos are compressed and stored separately from the main desk save. Season 1–5 photoshoot folders are matched onto the roster by name; those portraits live in `public/photos` so they load on the desk without a Drive login. Only people already on the enrollment list get a portrait.

```bash
npm run build
npm start
```

## What you can do

- **Add talent** as **Academy**, **Modeling**, or **Acting**. Subscribers stay on **Subscriptions**.
- **Welcome lock:** the desk opens on a locked welcome screen. Password is `viyatalent`. Use **Lock desk** in the sidebar when you leave the floor.
- **Save updates** in the header writes the current desk to this browser right away (Ctrl/Cmd+S does the same). The desk also auto-saves every 5 minutes. **Undo** and **Redo** sit next to Save (Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z) for tag changes, notes, and other desk edits. Staff notes on a talent file have their own **Save notes** button. Enrollment lives on the website now — unlinking the Google Sheet does not wipe notes, due dates, or payment plans.
- **Attendance** is check-in and the roll call in one place. Type a name to check in (Modeling, Acting, or Subscriber). Today and past nights sit on the same page. Staff check-ins post to the Jotform tracker; student-phone check-ins come back from that sheet.
- **Home** is a summary: today’s Phoenix time plus counts for Talent, Overdue, Collections, Sub overdue, and Pending. The alert name lists live on **Alerts**.
- **Payments** live on each talent file, not a left-side tab. The profile **Payments** tab is their calendar: live Square invoices when the API key is set, plus any desk rows. Date, item, amount, and status can be edited on any row. **Payments left** can be edited on the profile. **Dates** opens that month. Academy invoices run every two weeks on Friday.
- **Edit** on an open talent file changes name, nickname, age, email, phone, start date, class time, their enrollment tag, and **Overdue since**. Status and overdue since are also on the open file — Pending to Current after a deposit, Overdue, Paused, Collections, **Cancelling**, or Paid in full. Undo the last tag change from the header if it was a mistake.
- **Subscriptions** is the locked desk list only (the names staff sent). Square invoices mark each person current or overdue. Three plans: standard ($51.49 with tax), OG ($4.99), and the $100 plan (Scarlett Petroff). On a talent file, the **Subscription** tab sets status (Active, Interested, Paused) and which of those three plans they are on.
- **Talent** is the academy roster from the enrollment workbook (overdue and collections included). People who already finished or moved to a sub are on **Subscriptions**, not here. Each row has one plan tag, **PP** or **PIF**, like the enrollment sheet. Filter by plan or status. Sort **A–Z**, **Z–A**, newest start, or oldest start. Home **Pending** opens that filter sorted by start date. Pending is fuchsia. Green is only when there are no payments left.
- **Contacts** is everyone else. Tags match the Google Contacts lists: **Current Student**, **Active Subscribers**, **SEPTEMBER PHOTOSHOOT LIST**, and **MODEL SOURCE NOVEMBER**. Tap **×** on a tag to remove it from that person. **Newsletter** is the same people as **Active Subscribers**. Old Newsletter tags on current students are stripped. Duplicate contact/enrollment files for the same person are merged. Contact files say Contact, not Prospect. People with no list stay under All contacts. Student numbers only show when they are a numeric Square / enrollment ID (`#0938`). Those numbers match the enrollment STUDENT ID and the Square academy invoice title (`00938 Modeling & Acting Training`). Synthetic ids like `ENR…` or `VA-…` stay hidden. On a profile, **Student ID** can be added or changed — same number as Square. **Add talent** can take that number too, or leave it blank.
- **Calendar** lists Square and desk payment dates, plus dates you **Create** or **Edit**. A reminder is optional — turn it on only if you want that date to show on the website that day. **Send reminder now** logs it on the desk. Paused talent rows show start date and next payment due.
- **Photoshoots** live in Google Docs, not on this desk. There is no Photoshoots tab in the sidebar or on a talent file.
- **Alerts** lists overdue, collections, pending, wrapping up, and paid in full. Texts go out from the separate messaging site, not this desk.
- **Themes:** Dark and Light from the switcher in the bottom right. Light is white with dark text.
- **Times** on Attendance are **Arizona (Phoenix, MST)**. Arizona does not use daylight saving.

## Alerts

- **Overdue** — red. Workbook OVERDUE, declined-card notes, or any unpaid Square/desk installment whose due date has already arrived (including 09/17–09/19). One list.
- **Sub overdue** — orange. Subscribers only.
- **Collections / cancelling** — amber. Kept off the overdue list.
- **Paused** — violet, so the desk does not check them in by accident.
- **Pending** — blue, so deposit and first class stay visible.
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

The desk is the roster. Add and edit students here — including status tags, notes, due dates, and labels. The 2026 enrollment Google Sheet was pulled in a final time on 2026-09-23 (every tab) and saved natively; the site no longer reads that doc. Overdue is the saved OVERDUE status, declined-card notes, or a missed Square/desk payment on or before today. Collections and cancelling stay separate. Square installment dates stay on the calendar.

Google Contacts lists land in their matching place: **Current Student** on Students, **Active Subscribers** on Subscriptions, and the photoshoot / Model Source lists on Contacts. The full export is on **Contacts** with name, phone, email, and notes. **Newsletter** on Contacts is subscribers only.

Payments use Square invoices. The current installment due dates are baked into `data/square.json` and `data/seed.json` from a production pull (location `LC790E49DZ6B9`). Live API keys are optional — without them the desk still shows that snapshot. With `SQUARE_ACCESS_TOKEN` (Invoices Read + Customers Read) the desk refreshes production invoices onto each talent file. Desk schedules (date + amount on a talent file) also land on Calendar and Alerts.

The desk works without API keys. Copy `.env.example` to `.env.local` and add credentials when you want live send/sync:

| Service | Variables |
| --- | --- |
| Square invoices | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT=production` |
| Enrollment sheet | No longer used — the roster is native in `data/seed.json` |
| Textla texts | `TEXTLA_WEBHOOK_URL` (Zapier Catch Hook → Textla Send Message), `TEXTLA_FROM_NUMBER` |
| Jotform attendance | `JOTFORM_API_KEY` (or a webhook to `/api/jotform/webhook`) |
| Gmail | `GMAIL_USER`, `GMAIL_APP_PASSWORD` |
| Textla or Twilio | `TEXTLA_API_KEY` or `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` + `TWILIO_FROM_NUMBER` |

The student attendance tracker is [this Jotform](https://form.jotform.com/262377942791167). Staff check-ins on the desk are posted there. Student-phone check-ins come back to Attendance when you add a Jotform webhook to `/api/jotform/webhook` or an API key.

Edits (notes, statuses, check-ins, photos) are saved in this browser so the floor can keep working offline. They are not a replacement for Square itself.

Public site: [viyatalent.com](https://www.viyatalent.com) · Talent resources: [viyatalent.com/talentresources](https://www.viyatalent.com/talentresources)
