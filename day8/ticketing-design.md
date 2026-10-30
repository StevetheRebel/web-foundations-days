# TicketHub system design

TicketHub sells reserved seats for concerts and other events. This document follows six steps: requirements, estimates, API, data model, architecture and trade-offs. It describes a proposed design, not a running implementation.

## 1. Requirements

### Functional requirements

- Visitors can browse and search events by name, location and date.
- Visitors can view an event's details, prices and seat map.
- Registered users can temporarily hold available seats while checking out.
- Users can pay for their held seats and receive a booking confirmation.
- Users can view their purchased tickets and unique ticket codes.
- Failed, cancelled and expired bookings release their seats for other buyers.
- A waiting room controls admission to a popular sale.

### Non-functional requirements

These are proposed targets to verify through load testing.

| Concern | Target or rule |
| --- | --- |
| Speed | At least 95% of event-list and event-detail API requests complete within 500 ms under admitted load. Hold requests complete within 1 second for at least 95% of requests. External payment time and waiting-room time are measured separately. |
| Correctness | A seat for a particular event can belong to only one active hold and can be sold only once. Failed transactions leave no partial booking. |
| Payment safety | Retried payment requests and duplicate payment notifications must not create duplicate charges or tickets. A browser success page alone cannot confirm a payment. |
| Fairness | Use a documented first-in, first-out queue based on server-recorded arrival. Refreshing retains the same queue position. Require a signed admission token for checkout, limit each account to four seats per event, and apply rate limits to discourage bots and repeated attempts. Account limits reduce abuse but cannot eliminate multiple-account abuse. |
| Availability | Target 99.9% monthly availability for browsing. If safe booking cannot be guaranteed, temporarily stop new holds and show a clear message. |
| Scalability | Support normal demand and a controlled sale involving 200,000 buyers competing for 20,000 seats. Pre-scale before the announced sale and admit buyers at a rate verified by load tests. |
| Security | Use HTTPS, securely hashed passwords, authenticated checkout and ownership checks. The payment provider handles card details; TicketHub stores provider references, not card numbers. |
| Durability | Keep confirmed orders in a replicated SQL database with backups. Test recovery and monitor replication health. |

Assumptions: seats are reserved, holds last five minutes, and one order covers one event with up to four seats. Ticket transfers, resale and event cancellation refunds are outside this assignment's core scope.

## 2. Estimates

### Given facts

- 2,000,000 registered users.
- 50,000 visitors on a normal day, each viewing 10 pages.
- 5,000 tickets sold on a normal day.
- 200,000 people try to buy a popular concert's 20,000 seats within 10 minutes.

Registered users describe the account population, not simultaneous traffic. A day contains 86,400 seconds; 10 minutes contains 600 seconds.

### Normal traffic

Daily page views:

50,000 × 10 = **500,000 page views/day**.

Average page-view rate:

500,000 ÷ 86,400 = **5.79 page views/second**.

Average ticket-sales rate:

5,000 ÷ 86,400 = **0.058 tickets/second**, or about one ticket every 17.3 seconds.

For planning, assume a normal busy period is five times the daily average: about **28.94 page views/second** and **0.289 tickets/second**. This multiplier is an assumption, not a supplied fact.

### Popular-concert sale

Average arrival rate over the sale window:

200,000 ÷ 600 = **333.33 buyers/second**.

If all seats sell within those 10 minutes:

20,000 ÷ 600 = **33.33 tickets sold/second**.

Demand is **10 people per available seat**. With one ticket per successful buyer, at most 10% of the 200,000 buyers can succeed. Orders containing multiple seats reduce the number of successful buyers further.

For a browsing scenario, assume each sale visitor also views 10 pages during the window:

200,000 × 10 ÷ 600 = **3,333.33 page views/second**.

That is **576 times** the normal daily-average page-view rate, or about **115 times** the assumed normal busy-period rate. Selling 33.33 tickets/second is also **576 times** the normal daily-average ticket-sales rate. Buyer arrivals and ticket sales are different measures and must not be compared as though they were the same operation.

### Bursts and extra requests

The ten-minute average is not the actual instantaneous peak. As a stress-test scenario, suppose half the buyers arrive in the first minute:

100,000 ÷ 60 = **1,666.67 buyer arrivals/second**.

Seat refreshes, hold attempts, payment requests, images and retries add requests beyond page views. For example, if 20,000 admitted shoppers refresh seat availability every five seconds, that produces **4,000 seat-read requests/second**. This is a separate scenario; it should not be added to a page-view estimate that already counts those requests.

Use these scenarios to load-test the waiting room, cache and checkout path. Measure sustainable database throughput and payment-provider limits before choosing an admission rate. The supplied figures alone do not establish a safe server count or maximum capacity.

## 3. API design

Base path: `/api/v1`. Requests and responses use JSON. Event browsing is public; holds, orders and tickets require authentication. The server gets the user ID from the authenticated session, not from a user-supplied owner field.

| Method and endpoint | Purpose | Example input | Successful response |
| --- | --- | --- | --- |
| `GET /events?city=Nairobi&cursor=...` | Browse or search paginated events. | Optional filters and cursor. | `200`: event summaries and next cursor. |
| `GET /events/{event_id}` | View event details. | Event ID in path. | `200`: title, venue, start time, sale time and prices. |
| `GET /events/{event_id}/seats?section=A` | View seat locations, prices and current displayed availability. | Event ID and optional section. | `200`: seats and an `as_of` timestamp. Availability is advisory until a hold succeeds. |
| `POST /events/{event_id}/holds` | Create a pending order and hold all requested seats atomically. | `{"seat_ids":[101,102]}` plus an admission token during a queued sale. | `201`: `order_id`, held seats, total and `hold_expires_at`. |
| `DELETE /orders/{order_id}/hold` | Release the caller's unpaid hold. | Order ID. | `204`: hold released, including if already released. An order being paid cannot be released this way. |
| `POST /orders/{order_id}/payments` | Start payment for the caller's valid held order. | Provider payment token and an `Idempotency-Key` header. | `202`: payment reference and `processing` status. |
| `GET /orders/{order_id}` | Check the caller's order and payment outcome. | Order ID. | `200`: status, total and seats. |
| `GET /me/tickets?cursor=...` | View the caller's purchased tickets. | Optional pagination cursor. | `200`: tickets for confirmed orders, with event, seat and ticket code. |
| `POST /payments/webhook` | Receive signed payment-provider notifications. | Provider event ID, payment reference and outcome. | `200` after durable recording; duplicate notifications have no additional effect. |

The server calculates prices from the database and stores them on the order. Clients cannot choose the amount to charge. Repeating the same hold or payment request with the same idempotency key returns the existing result; reusing that key with different input returns a conflict.

Useful errors:

- `400`: malformed input or too many requested seats.
- `401`: authentication required.
- `403`: another user's order or missing/invalid sale admission token.
- `404`: event, seat or order does not exist.
- `409`: a requested seat is unavailable, the hold expired or the order state prevents the operation.
- `429`: rate limit reached; include retry guidance.
- `503`: booking temporarily unavailable; do not report an unconfirmed booking as successful.

Example seat conflict:

```json
{
  "error": "seat_unavailable",
  "message": "One or more selected seats are no longer available. Please choose again."
}
```

## 4. Data model and booking correctness

Use a relational SQL database because booking depends on relationships, transactions and constraints. Each row in `seats` represents a seat at one specific event, rather than a physical seat shared across all events.

### Tables

| Table | Main columns and constraints |
| --- | --- |
| `users` | `user_id` primary key, `name`, unique required `email`, `password_hash`, `created_at`. |
| `events` | `event_id` primary key, `title`, `venue`, `starts_at`, `sale_starts_at`. |
| `seats` | `seat_id` primary key, `event_id` foreign key, `section`, `row_label`, `seat_number`, `price_minor`, `currency`, `status`, nullable `current_order_id` foreign key, nullable `hold_expires_at`. Unique `(event_id, section, row_label, seat_number)`. |
| `orders` | `order_id` primary key, `user_id` and `event_id` foreign keys, `status`, `total_minor`, `currency`, `hold_expires_at`, `created_at`, `confirmed_at`, `idempotency_key`. Unique `(user_id, idempotency_key)`. |
| `order_items` | `order_item_id` primary key, `order_id` and `seat_id` foreign keys, `price_minor`, nullable unique `ticket_code`. Unique `(order_id, seat_id)`. Keeps attempted-order history even after a hold expires. |
| `payments` | `payment_id` primary key, unique `order_id` foreign key for one logical payment per order, unique `provider_reference`, `status`, `amount_minor`, `currency`, unique `idempotency_key`. Network retries reuse that logical payment. |
| `payment_events` | `provider_event_id` primary key, `payment_id` foreign key, `received_at`, payload and processing status. Deduplicates notifications and allows background retries. |

Amounts use integer minor units, such as cents, with non-negative checks. Required fields use `NOT NULL`. Status checks restrict seats to `available`, `held`, `payment_pending` or `sold`, and orders to `held`, `payment_pending`, `confirmed`, `expired` or `cancelled`.

Seat-state checks require available seats to have no current order or expiry, held seats to have both, and sold seats to have a current order and no hold expiry. Cross-table validation in the booking transaction ensures all seats belong to the order's event and currency. The API cannot update seat state directly outside the booking workflow.

### Relationships

```text
users  1 ---- many orders many ---- 1 events
                    |
                    1
                    |
                   many
                order_items many ---- 1 seats many ---- 1 events

orders 1 ---- 0..1 payments 1 ---- many payment_events
orders 1 ---- many seats (through seats.current_order_id)
```

An order contains one or more order items. A seat may appear in several historical expired orders, but its single current-order field determines its active owner. Add indexes on `events.starts_at`, `seats(event_id, status)`, `orders(user_id, created_at)` and hold-expiry fields.

### Preventing two people from buying the same seat

The SQL primary database is the authority for seat ownership. Cache entries and the waiting room cannot grant ownership.

1. Begin a database transaction. Lock the user's row so concurrent requests cannot bypass the four-seat limit. Count that user's active holds, payment-pending seats and confirmed seats for the event.
2. Lock all requested seat rows with `SELECT ... FOR UPDATE`, always in ascending seat-ID order to reduce deadlock risk.
3. Check the event, sale admission, account limit and every seat's state using database time. If a seat is held by an expired order, expire that order and release its seats through the same coordinated locking workflow before trying again. Never reclaim a `payment_pending` seat through ordinary expiry.
4. If any seat is unavailable, roll back the whole request. Otherwise create the order and items, mark every seat `held`, set `current_order_id` and set a five-minute expiry. Commit before returning success.

For example, Alice and Bob both request seat A12. Alice locks the row first. Bob waits. Alice commits her hold; Bob then reads the locked row's updated state and receives `409`. If Alice's transaction fails, its changes roll back and Bob may acquire the seat. Two app servers do not bypass the same database lock.

Primary keys and the unique event-seat location prevent duplicate inventory rows. A partial unique index on `order_items(seat_id)` where `ticket_code IS NOT NULL` provides an additional rule: only one issued ticket can exist for a seat. Issue the ticket code and confirm the order in the same transaction. Historical unpaid order items have no ticket code.

### Payment, expiry and retries

- Before contacting the payment provider, use a short transaction to lock the order and its seats, verify that the hold is still valid and owned by this order, and move them to `payment_pending`. Expiry workers use the same locks, so payment initiation and expiry cannot both win.
- Commit, then call the provider with the stored idempotency key. Do not keep a database transaction open during the external call. A crash or timeout triggers reconciliation using the same payment reference/key.
- Verify webhook signatures, reference, amount and currency. Record each provider event once. A processing transaction locks the order and seats, confirms successful payment, marks seats sold and assigns ticket codes atomically. Duplicate notifications return the existing outcome.
- On confirmed failure or confirmed cancellation, release seats and cancel the order. A background worker expires ordinary unpaid holds using database time and locked state checks.
- An uncertain payment remains reserved while a worker queries or cancels it with the provider. A timeout alone does not prove that no charge occurred. Release seats only after a definitive unsuccessful outcome. An unexpected late success for a closed order goes to refund/reconciliation rather than claiming a seat now owned by someone else.

Payment and the SQL database do not share one transaction. Durable payment state, idempotency and reconciliation connect them safely. Users receive tickets only after the database confirms the booking.

## 5. Architecture and handling the big sale

```text
[Browser] ---- static files/posters ----> [CDN + file storage]
    |
    +---- queue requests ----> [Waiting room + rate limits]
    |                                  |
    |                           signed admission token
    v                                  v
[Load balancer] ----------------> [Stateless app servers]
                                          |
                      +-------------------+--------------------+
                      |                   |                    |
                      v                   v                    v
              [Read cache]        [SQL primary]       [Payment provider]
                                         |                    |
                                    replication       signed webhook
                                         v                    |
                                  [Standby database]          v
                                                        [App servers]

[Background workers] <----> [SQL primary: holds, payment events,
                            reconciliation work, confirmed orders]
         |
         +---- provider status checks ----> [Payment provider]
         +---- confirmation delivery -----> [Email service]
```

| Component | Role during normal use and the big sale |
| --- | --- |
| Browser | Shows events, queue position, hold countdown and payment status. Uses controlled refresh intervals with backoff. |
| CDN and file storage | Deliver static assets and event posters without making app servers serve every file. |
| Waiting room and rate limits | Maintain queue position and admit a bounded number of buyers. Checkout validates admission server-side so direct API requests cannot skip the queue. Queue polling is rate-limited and handled separately from checkout. |
| Load balancer | Sends API requests to healthy app servers. |
| Stateless app servers | Authenticate users, validate input, run booking transactions and coordinate payments. Add instances before the sale. |
| Read cache | Serves popular event information and short-lived seat-map snapshots. A stale display can cause a rejected hold, but cannot authorize a booking. |
| SQL primary | Owns seat state, locks, constraints, orders and durable payment processing. Keep transactions short and cap database connections. |
| Standby database | Supports recovery if the primary fails. Booking pauses during uncertain failover; promote only a safely synchronized standby and prevent the old primary from accepting writes. Browsing may remain available from cache. |
| Payment provider | Processes payment using idempotent requests and signed notifications. Its capacity also limits checkout admission. |
| Background workers | Expire unpaid holds, retry durable payment events, reconcile uncertain payments and send confirmations after commit. Confirmation retries do not create new tickets. |

Before the sale, warm event caches, pre-scale app and waiting-room capacity, and load-test burst arrivals plus same-seat contention. Keep all writes for one event on one authoritative database path; adding app servers does not remove contention for the same seat.

During the sale, adjust admission to measured database latency, connection use, payment backlog and provider limits. Queue the excess demand outside checkout. Use backoff to prevent retries and seat refreshes from overwhelming the system. Preserve admission-token validity and a user's place across ordinary refreshes.

Monitor hold conflicts, expired holds, payment uncertainty, errors and queue wait times. When the event sells out, update the waiting room and stop admitting new buyers unless seats are released. This design protects correctness by limiting work entering checkout, rather than promising all 200,000 people immediate access.

## 6. Trade-offs

### Strong consistency versus immediate booking availability

Row locks and one authoritative seat record protect against double-booking. They introduce waiting when many buyers request the same seats, and checkout must pause when database ownership is uncertain. For paid tickets, rejecting or delaying a request is preferable to selling one seat twice.

### Fair admission versus waiting time

A first-in, first-out waiting room protects checkout and makes admission understandable. Buyers may wait and still miss out because demand exceeds supply. Queue order also favors people whose requests arrive sooner; a randomized pre-sale queue would reduce that timing advantage but adds another policy to explain and implement.

### Longer holds versus available inventory

A five-minute hold gives buyers time to pay. It also keeps seats away from other buyers when a checkout is abandoned. Shorter holds improve turnover but create more failed checkouts. Start with five minutes and review completion data. Uncertain payments require a separate reconciliation policy and may reserve seats longer.

### Cached browsing versus fresh seat information

Caching lowers database load and speeds up browsing. Seat displays can briefly lag behind confirmed holds. Short expiry times and refreshes improve freshness, while the transactional hold endpoint remains the final availability check.
