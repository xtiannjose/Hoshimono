# Load test

Batch 6.1: checkout and Slot booking at 5x the expected peak, without overbooking a Slot or overselling stock.

## The expected peak (an assumption until there is real traffic)

One Hub runs 6 Slots a day of 20 places: at most 120 Orders a day. The peak assumed here is a payday evening when a third of a day's Orders arrive together: **40 checkouts in 5 minutes**. Five times that is **200 checkouts in 5 minutes**, about 0.7 a second. Replace these numbers once the soft launch shows real ones.

## How to run it

- `npm run load:checkout` resets and seeds the `hoshimono_load` database (create it once: `docker exec hoshimono-db psql -U postgres -c "CREATE DATABASE hoshimono_load"`), then calls `placeOrder` directly, as Checkout does, and checks the books afterwards. Set `LOAD_DATABASE_URL` to use another database; the script refuses any name but `hoshimono_load`, because it wipes it.
- `npm run load:pages` asks a running production server (`npm run build && npm start`, or `LOAD_BASE_URL` for a preview deployment) for Home, a Category, a Product, search and a Filipino page, 50 shoppers at a time for 30 seconds.

Both are plain Node scripts with no load-testing tool to install. k6 or similar is worth it once a preview deployment exists and the test has to drive real browsers' requests from outside.

## Results, 27 Oct 2026 (laptop, Postgres 17 in Docker)

**Checkout** (`scripts/load-checkout.ts`, one Node process, 10 database connections):

| Run                                | Checkouts | Time   | Rate | p50    | p95    | Result                             |
| ---------------------------------- | --------- | ------ | ---- | ------ | ------ | ---------------------------------- |
| One at a time                      | 20        | 3.2 s  | 6/s  | 146 ms | 209 ms | 20 placed                          |
| Rush, 25 at a time                 | 200       | 17.7 s | 11/s | 1.95 s | 2.6 s  | 200 placed                         |
| Slot's last 5 places, 50 at once   | 50        | 2.0 s  |      | 1.9 s  | 1.9 s  | 5 placed, 45 told the Slot is full |
| Product's last 3 units, 30 at once | 30        | 1.7 s  |      | 1.6 s  | 1.6 s  | 3 placed, 27 told it sold out      |

After every run: no Slot booked past its capacity, every Slot's count matches its Orders, and every Product's reserved stock matches its open Orders.

What this says:

- 5x peak is 0.7 checkouts a second; one server process places about 11 a second, so there is room of about 15 times on this laptop.
- A checkout on its own takes about 150 ms. Under the rush, time goes to waiting: for one of the 10 connections, and for row locks on the same Slots and popular Products, which is the price of never overselling.
- Races end exactly right: the last places and the last units go to as many Customers as there are, and everyone else gets a clear "full" or "sold out".
- **Limit found:** 200 checkouts started in the same instant in one process wait longer than the 5 s `placeOrder` allows for a free connection, and fail with an error page (the Cart is left as it was). On Vercel, requests spread over many instances and Neon's pooler, so one process should not see that; the preview deployment run below checks it.

**Pages** (`scripts/load-pages.mts`, `next start`, one process, 28 Oct, nothing else running):

| Run                         | Pages | Rate | p50   | p95   | p99   | Failures |
| --------------------------- | ----- | ---- | ----- | ----- | ----- | -------- |
| 50 shoppers, no pause, 30 s | 691   | 23/s | 3.0 s | 4.7 s | 5.1 s | none     |

One page on its own takes 140 to 440 ms (Category and search are the slowest). Every page is rendered for each request, so one process tops out at about 23 a second on this laptop, and the waiting time above is the queue. Fifty shoppers who never pause are many times more than one Hub's evening; real shoppers spend seconds on each page. On Vercel, pages are spread over instances. If hosting costs grow, caching the catalogue part of Home, Category and Product pages is the lever.

## Still to do on real hosting

When the Vercel preview and the Neon branch exist (section 11 of the roadmap): run `npm run load:pages` with `LOAD_BASE_URL` set to the preview, run a checkout load from outside through the real Checkout (k6), and watch Neon's connection count and Vercel's function errors while it runs.
