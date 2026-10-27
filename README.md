# My UoPeople journey

A local website documenting Apoorv Darshan's University of the People education: verified expenses, scholarships, milestones, transferred credits, courses taken at UoPeople, and both Computer Science diplomas.

Live at **https://uopeople.apoorvdarshan.com**.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. The dev server binds only to `127.0.0.1` and refuses to silently switch ports.

```sh
npm run build
npm test
```

## Deploy

The site is static and served by Cloudflare Workers static assets on the `uopeople.apoorvdarshan.com` custom domain (`wrangler.jsonc`).

```sh
npm run deploy
```

## Evidence and accounting

The sanitized dataset is `src/data.json`. Confirmed spending is **USD 581.89**: USD 558.08 paid in dollars plus the INR 2,099 Coursera Plus payment, converted at ₹88.16 per $1 (European Central Bank reference rate on the payment date, 19 Sep 2025, via Frankfurter) to USD 23.81. The university ledger accounts for USD 427, Sophia USD 79, and three ProctorU purchases USD 52.08. Coursera Plus accounts for INR 2,099 including GST (USD 23.81).

The application fee was grant-covered. A USD 2,100 assessment scholarship was awarded; the report confirms ten assessments covered, without printing the amount actually drawn. Awards, waived fees, bank notifications for already-counted purchases, and renewal cancellations are not added to personal cash spending. Ten unrelated February 2025 Coursera certificate purchases are excluded from this degree pathway.

The official transcript records 63 Coursera transfer credits, 27 Sophia transfer credits and 30 credits earned at UoPeople. The transfer table lists the UoPeople course each transfer was accepted as, from the portal's transfer credit evaluation and degree audit. Sophia rows name the exact Sophia course accepted. For Coursera, the evaluation lists the 21 accepted courses but not which ACE subject filled each, so the 21 subjects are listed separately by certificate rather than paired. Historical personal results are not guarantees for future applicants. See the site's Sources & notes for official policy links and limitations.

## Currency

The site shows US dollars by default. Visitors can switch every amount to any ECB reference currency from the header or the cost table; the choice is remembered in the browser. Conversions use the latest rates from `https://api.frankfurter.dev`, falling back to the saved snapshot in `src/rates.json` when offline. Payments made in the chosen currency keep their exact original amount. Notes, timeline text and source records keep the currency of the original document.

## Design

University of the People brand colours (plum, berry, pink, teal and gold) with Atkinson Hyperlegible Next. Light and dark themes follow the visitor's system setting. The hero shows all 40 three-credit courses on the transcript as squares, coloured by where each was earned. The UoPeople logo comes from Wikimedia Commons (CC BY 4.0) and is recoloured into `public/brand/`. This is a personal site, not affiliated with or endorsed by the university.

## Privacy

The site contains selected facts and standalone diploma images requested by the owner. Full transcripts, email bodies, address, date of birth, student identifiers, payment identifiers and credentials are not included. Diploma images are genuine supplied documents. The associate diploma is a phone photo, cleaned only for lighting: uneven light and the shadow removed and the paper whitened. Its wording, seal and signatures are unchanged.

Research was read-only. Emails and source documents were not modified. The owner chose to publish the site publicly.
