# Thrive Skill Tech — Razorpay Backend

A tiny Node/Express server with two jobs:

1. **Create a Razorpay order** when someone clicks "Pay Now" on the site (`POST /api/create-order`)
2. **Verify the payment signature** after checkout completes, so nobody can fake a successful payment (`POST /api/verify-payment`)

Your Razorpay **Secret Key** lives only here, on the server — never in the website's HTML/JS. That's the whole reason this backend exists.

---

## 1. Get your Razorpay API keys

1. Log into [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Complete KYC / business activation (required before accepting **live** payments — you can test without it using Test Mode)
3. Go to **Settings → API Keys → Generate Key**
4. You'll get a **Key ID** (starts with `rzp_test_` or `rzp_live_`) and a **Key Secret** — copy both

## 2. Run it locally (optional, to test first)

```bash
cd thrive-skill-tech-backend
npm install
cp .env.example .env
# edit .env and paste in your real RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
npm start
```

Visit `http://localhost:3000/health` — you should see `{"status":"ok"}`.

## 3. Deploy it somewhere public

The website needs to reach this backend over the internet, so it has to be deployed (not just run on your laptop). Easiest free options:

### Option A — Render.com (recommended, free tier available)
1. Push this `thrive-skill-tech-backend` folder to a GitHub repo
2. On Render: **New → Web Service** → connect the repo
3. Build command: `npm install`　·　Start command: `npm start`
4. Under **Environment**, add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as environment variables (don't upload your `.env` file — set them in Render's dashboard instead)
5. Deploy. Render gives you a URL like `https://thrive-skill-tech-backend.onrender.com`

### Option B — Railway.app
Same idea: connect the repo, set the two environment variables, deploy. You'll get a `*.up.railway.app` URL.

### Option C — Your own VPS
`npm install && npm start` behind a process manager like `pm2`, with a reverse proxy (nginx) handling HTTPS.

## 4. Connect it to your website

Once deployed, you'll have a live backend URL (e.g. `https://thrive-skill-tech-backend.onrender.com`).

In each of the website's HTML files, find this line near the bottom:

```js
const BACKEND_URL = "REPLACE_WITH_YOUR_BACKEND_URL";
```

Replace `REPLACE_WITH_YOUR_BACKEND_URL` with your real backend URL (no trailing slash). Send me that URL and I can update all the pages for you directly.

## 5. Go live

- Test everything first with your **Test Mode** keys (`rzp_test_...`) — Razorpay gives you dummy card numbers for test payments, listed in their docs.
- Once you're confident it works end-to-end, switch `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in your host's environment variables to your **Live** keys (`rzp_live_...`).

## What this backend does NOT do yet

- **Doesn't save enrollments to a database.** Right now, verified payments are just logged to the console and kept in memory (lost on restart). If you want paid enrollments saved somewhere durable — and automatically emailed/WhatsApped to you — that's a follow-up step once this base flow is confirmed working.
- **Doesn't send confirmation emails/receipts.** Razorpay does send its own payment receipt automatically, but a branded "you're enrolled" email would need to be added here too.

## Endpoints reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Check the server is running |
| POST | `/api/create-order` | Body: `{ amount, courseName, customerName?, customerPhone?, customerEmail? }` |
| POST | `/api/verify-payment` | Body: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` |
| GET | `/api/orders` | Debug: view recent orders created this session |
