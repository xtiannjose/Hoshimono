# Hub dry run

The Phase 4 exit check (`docs/07-ROADMAP.md` section 10): a day of 20 real-looking Orders worked by one Picker and one Rider **with no developer help**. That includes three shorts, two Substitutions and one weighed adjustment, and every status change must show in the Order's history.

The point is not to prove the code works; the e2e suite does that. The point is to find out where a person gets stuck. Keep a pen and write down every moment someone had to ask what to do.

## Before you start

1. Start Docker Desktop and check that the `hoshimono-db` container is running.
2. Refresh the data: `npm run db:seed`.
3. Place the day's Orders: `npm run db:dry-run`. It prints the run sheet: each Order's number, Slot, Customer and what to do with it. Print it or keep it open.
4. Start the app: `npm run dev`, then open `http://localhost:3000/dev/sign-in`.

Use one browser window per person. Sign in at `/dev/sign-in` with one click each:

| Person                      | Sign in as | Works on                         |
| --------------------------- | ---------- | -------------------------------- |
| Picker                      | Picker     | `/admin/pick`                    |
| Dispatcher (Marites Aquino) | Dispatcher | `/admin/dispatch`, `/admin/cash` |
| Rider (Jun Dela Rosa)       | Rider      | `/admin/deliveries`              |
| Owner                       | Admin      | `/admin/orders`, `/admin/report` |

Until real SMS is set up, texts to Customers appear in the terminal running `npm run dev` as lines starting with `[sms] to +63...`. Whoever plays the Customers reads the Substitution links and Delivery PINs from there.

Running `npm run db:dry-run` again the same day places nothing twice. For a fresh day, run `npm run db:seed` first.

## The run

**Picking** (Picker). Open `/admin/pick`, choose an Order, tap **Start picking**, then work down the list:

- Most lines: **Found all**. Weighed lines: type the packed weight and tap **Save weight**.
- The run sheet marks the special Orders:
  - **Short** (three Orders): tap **Short**, enter how many were found, **Save**.
  - **Substitute** (two Orders): tap **Short**, enter 0, **Save**, choose the substitute and tap **Offer substitute**. The Customer opens the link in their text and answers (the run sheet says yes or no). If nobody answers within 10 minutes, it counts as a yes.
  - **Weighed** (one Order): enter the weight from the run sheet instead of the estimate.
- Tap **Finish picking**. The Order shows **Ready for the Rider**.

**Dispatch** (Dispatcher). At `/admin/dispatch`, choose **Jun Dela Rosa** for each ready Order and tap **Send out**.

**Delivery** (Rider). At `/admin/deliveries`, for each stop: enter the Customer's 4-digit PIN from their text, check the cash amount, tap **Delivered**. Try one wrong PIN on purpose to see the warning.

**End of day**:

- Dispatcher: at `/admin/cash`, count Jun's cash and tap **Record count**. It should match.
- Owner: open three Orders at `/admin/orders` and read their **History**: Confirmed, Picking, Ready for the Rider, On the way, Delivered, each with who did it.
- Owner: `/admin/report` shows 20 delivered, the fill rate below 100% (the shorts) and the Substitution rate.

## Passed when

- [ ] All 20 Orders delivered, by one Picker and one Rider
- [ ] Three shorts, two Substitutions (one yes, one no) and one weighed adjustment done
- [ ] Every Order's history shows each status change
- [ ] The cash count matches
- [ ] Nobody needed a developer. Every question asked is written down below, with what would have answered it on screen

## Notes from the run

Date, who played which role, and every question or stumble:

-

## The same run, automated

`DRY_RUN=1 E2E_PROD=1 npx playwright test e2e/dry-run.spec.ts` works the same 20 Orders through the screens on a production build (about 15 minutes, including the build) and saves screenshots of the dispatch board, the Rider's list, the cash count and the report. It shows the screens work with a full day; only people can show that the screens are clear.
