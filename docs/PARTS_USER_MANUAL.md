# INGRID DMS Parts User Manual

This guide is for parts counter staff, parts managers, service advisors who work with parts approvals, and fixed-ops users who need to understand the parts desk workflow in the INGRID DMS MVP.

The goal is simple:

- show the main parts screens
- explain the order of work
- document the exact parts desk actions
- make sure quoted, sourced, ordered, arrived, declined, and invoiced parts stay visible

This is an operating manual for day-to-day dealership use.

## Who This Manual Is For

Primary users:

- Parts Counter
- Parts Manager
- Service Advisor
- Technician for parts handoff visibility

Primary workflows:

1. open the right customer and RO
2. create a parts quote
3. choose source and bin
4. place special order when needed
5. update ETA and customer follow-up
6. mark arrived and ready to deliver
7. manage approvals and declined parts follow-up
8. create the parts invoice

## Core Parts Record Flow

In INGRID, parts work should move in this order:

1. `Customer`
2. `Vehicle`
3. `Repair Order (RO)`
4. `Parts Quote`
5. `Source / Bin Control`
6. `Special Order` when needed
7. `ETA Update`
8. `Arrival / Ready to Deliver`
9. `Approval or Decline`
10. `Parts Invoice`

Important rule:

- do not let parts work drift away from the active customer, VIN, and RO
- every source, ETA, and delivery decision should be visible from the same job

## Main Parts Screens

### 1. Parts Dashboard

Use this when you need to manage the parts desk storewide.

Expected queues include:

- `Open Parts Work`
- `Waiting Approval`
- `Declined Quotes`
- `Special Orders In Flight`
- `Arrivals / Ready To Deliver`

Use the dashboard to drill into the correct customer and RO before doing detailed counter work.

### 2. Parts Workspace

Use this when you are working one customer, one vehicle, and one active repair order.

The workspace is organized around:

- parts quote and approval
- source and bin control
- ETA follow-through
- arrival and bay delivery
- invoice and counter closeout

### 3. Parts DMS Windows

Use these as your working transaction forms:

- `Create Parts Quote`
- `Create Special Order`
- `Source / Bin Control`
- `Update ETA / Customer Follow-Up`
- `Mark Part Arrived`
- `Mark Ready to Deliver`
- `Declined Follow-Up`
- `Create Parts Invoice`

These windows are meant to behave like the parts counter desk, not like generic notes.

## How To Start Work

### Option A: Start from the Parts Dashboard

Use this when:

- you are working the full department queue
- you need to find waiting approvals, special orders, or arrivals

Steps:

1. Open `Parts`
2. Review the queue boards
3. Click the right row
4. Confirm the customer, VIN, and RO context
5. Continue from the parts workspace

### Option B: Start from the Active RO

Use this when:

- service or technician already has the RO open
- parts work is being added during the live repair process

Steps:

1. Open the customer in `Parts`
2. Confirm the correct RO is active
3. Use the parts workspace actions or the parts approval rail

## Parts Desk Workflow

### 1. Create Parts Quote

Use this when:

- the customer needs to approve parts
- the part should be quoted before it is ordered or billed

Steps:

1. Click `Create Parts Quote`
2. Confirm the active RO
3. Add one or more line items
4. Enter:
   - part number
   - description
   - quantity
   - price
   - source
   - status
   - bin if known
   - ETA if known
5. Save

Expected result:

- quoted parts are attached to the active RO
- the quote can now move into approval
- `Waiting Approval` can pick up the work

### 2. Source / Bin Control

Use this when:

- the counter has decided where the part will come from
- the desk needs the bin or staging location recorded

Steps:

1. Click `Source / Bin`
2. Enter:
   - part number
   - source
   - vendor
   - bin location
   - ETA
   - desk status
   - notes
3. Save

Expected result:

- sourcing and location are logged into the job trail
- a parts follow-up task is created for the desk
- the work stays visible from the same customer and RO

### 3. Create Special Order

Use this when:

- the part is VIN-specific
- the part is customer-approved and must be ordered
- stock is not available

Steps:

1. Click `Create Special Order`
2. Enter:
   - part number
   - vendor
   - source
   - order type
   - quantity
   - unit cost
   - ETA date
   - status
   - bin or staging
   - vendor reference
   - notes
3. Save

Expected result:

- a special order record is created
- a counter follow-through task is added
- the order appears in `Special Orders In Flight`

### 4. Update ETA / Customer Follow-Up

Use this when:

- the vendor changed the ETA
- the customer or advisor needs an update
- the part is delayed or arriving today

Steps:

1. Click `Update ETA`
2. Enter:
   - part number
   - ETA date
   - customer update method
   - order posture
   - notes
3. Save

Expected result:

- ETA is logged in the workflow trail
- the parts queue shows the job as active follow-through
- service can see the latest timing posture

### 5. Mark Part Arrived

Use this when:

- the part is physically in the dealership
- the counter has received it and wants the queue to show arrival

Steps:

1. Click `Mark Arrived`
2. Enter:
   - part number
   - bin or staging
   - delivery target
   - notes
3. Save

Expected result:

- the arrival is logged
- the job can move into `Arrivals / Ready To Deliver`

### 6. Mark Ready to Deliver

Use this when:

- the part has been staged and is ready for the advisor, bay, or technician

Steps:

1. Click `Ready to Deliver`
2. Enter:
   - part number
   - bin or staging
   - delivery target
   - notes
3. Save

Expected result:

- the part is visible as ready for handoff
- the parts queue shows it as delivery-ready

### 7. Approvals

Use the approval rail when the customer must approve quoted parts.

Available methods:

- `Send via SMS`
- `Send via Email`
- `E-signature`
- `Wet signature`
- `Mark declined`
- `Declined follow-up`

Use these actions to preserve a paper trail. Do not rely on memory or side conversations.

Expected result:

- approval events stay tied to the active RO
- the desk has visible follow-up tasks
- the quote can move into approved or declined workflow

### 8. Declined Follow-Up

Use this when the customer declines quoted parts but the desk still needs a next move.

Examples:

- save attempt
- alternate part
- defer
- close declined

Steps:

1. Click `Declined Follow-Up`
2. Choose the next move
3. Set the follow-up date
4. Enter the recovery notes
5. Save

Expected result:

- the declined decision stays visible
- a real parts follow-up task is created
- `Declined Quotes` can be worked like a real counter queue

### 9. Create Parts Invoice

Use this when:

- the parts work is ready to post to the customer ledger
- the counter needs to bill parts separately from the service invoice

Steps:

1. Click `Create Parts Invoice`
2. Confirm:
   - invoice number
   - payment method
   - receivable type
   - subtotal
   - tax
   - fees
   - total
   - due date
3. Save

Expected result:

- the parts receivable is posted
- accounting can see the billed amount
- the customer ledger stays connected to the same RO

## Recommended Operating Rules

### Quote before order

When customer approval is required:

- quote first
- get signoff
- then place the special order

### Always record ETA changes

If ETA changes:

- update it in the desk
- do not leave it only in a text, email, or memory

### Use arrival states consistently

Use:

- `Arrived` when the part is on hand
- `Ready to Deliver` when the counter has staged it for the next step

### Treat declined work as active work

Declined parts are not finished just because they were declined.

Use `Declined Follow-Up` to:

- save the job
- offer alternatives
- defer intentionally
- close the loop cleanly

## Daily Parts Desk Checklist

Start of day:

1. open `Parts`
2. review `Waiting Approval`
3. review `Special Orders In Flight`
4. review `Arrivals / Ready To Deliver`
5. review `Declined Quotes`

During the day:

1. quote parts against the active RO
2. lock source and bin decisions
3. update ETAs when they change
4. mark arrivals and ready states
5. push approvals and declined recovery

End of day:

1. clear arrival items that were delivered
2. review special orders still in flight
3. make sure declined follow-ups have next dates
4. post any parts invoices that are ready

## Troubleshooting

### I do not see the right part on the desk

Check:

- correct customer
- correct VIN
- correct active RO

### The queue does not reflect the latest counter action

Check whether the action was saved through the DMS popup window, not just discussed outside the system.

### A declined quote disappeared

Use `Declined Follow-Up` and confirm the follow-up task was created in the parts queue.

### The part arrived but the bay does not know

Use `Mark Arrived` or `Ready to Deliver` so the workflow is visible from the same customer and RO.

## Training Walkthrough

Use this quick training script with a new parts counter user:

1. open a customer with an active RO
2. create a parts quote
3. send approval
4. place a special order
5. update ETA
6. mark arrived
7. mark ready to deliver
8. create a declined follow-up
9. create the parts invoice

If the user can complete that flow confidently, the parts desk is ready for MVP use.
