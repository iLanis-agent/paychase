# PayChase

Late payment is the silent tax on freelancers: the invoice goes out, the client goes
quiet, and chasing it means keeping the whole ledger in your head. PayChase is a
cash-flow radar - every invoice gets an aging bucket, an accrued late fee, and a
follow-up schedule (day 1, day 7, day 14, then weekly), so the worst offender is
always at the top and no invoice goes silent.

- Aging buckets: open, due today, follow up (1-7d), late (8-30d), stale (31d+)
- Automatic nudge schedule so you always know the next follow-up date
- Pro-rata late-fee accrual at your own monthly rate
- Summary strip: total outstanding, total overdue, fees accrued, oldest overdue
- No signup, nothing to install - pure static HTML/JS; everything persists in `localStorage`
- `engine.js` holds the aging, nudge and fee math as pure functions, shared between
  the app and node tests

## Use it

Open `index.html`, or visit the deployed site.

## Run locally

Any static server works:

```
python3 -m http.server
```

Then open http://localhost:8000/.

## Engine tests

The node suite covers due-date and overdue math (including month boundaries), every
bucket edge (0/1/7/8/30/31 days), the full nudge cadence (day 1/7/14 then weekly,
and not-yet-due invoices), late-fee pro-rating (full month, partial month, zero
before due), worst-first sorting, and summary totals that exclude paid invoices.
