# INGRID DMS Accounting User Manual

This guide is for dealership accounting staff, controllers, office managers, and back-office users working inside the INGRID DMS MVP.

The goal is simple:

- explain the accounting desks and boards
- document the main accounting transaction windows
- show how accounting stays tied to the same customer, VIN, and RO
- keep AR, AP, WIP, warranty receivables, and reconciliation visible

This is a daily operating manual, not a technical design document.

## Who This Manual Is For

Primary users:

- Accounting Clerk
- Office Manager
- Controller
- Warranty / Receivables follow-through users

Primary workflows:

1. review customer and RO financial posture
2. create AR and AP records
3. apply customer payment
4. review or post WIP
5. advance warranty receivables
6. queue reconciliation review

## Core Accounting Record Flow

In INGRID, accounting work should stay connected to this order:

1. `Customer`
2. `Vehicle`
3. `Repair Order (RO)`
4. `AR Invoice` and `AP Bill`
5. `Accounting Entry`
6. `Cash Receipt / Payment`
7. `WIP Review`
8. `Warranty Receivable`
9. `Reconciliation Review`

Important rule:

- accounting should not live outside the RO spine
- every receivable, payable, payment, WIP decision, and warranty follow-through should stay visible from the same job

## Main Accounting Screens

### 1. Accounting Dashboard

Use this when you need a department-wide view.

Expected queues include:

- `AR Aging`
- `AP Aging`
- `Open WIP`
- `Warranty Receivables`
- `GL Setup`
- `Open Accounting Reviews`
- `Open RO Balances`
- `AR Due`
- `AP Due`

Use these boards to find the job that needs review first.

### 2. Accounting Workspace

Use this when you are working one customer, vehicle, and repair order.

The workspace is organized around:

- invoice and balance review
- payment rail
- WIP and warranty follow-through
- reconciliation and ledger notes

### 3. Accounting DMS Windows

Use these as the working transaction forms:

- `Create AR Invoice`
- `Create AP Bill`
- `Apply Customer Payment`
- `Post / Review WIP`
- `Advance Warranty Receivable`
- `Queue Reconciliation Review`
- `Post Accounting Entry`

These are meant to behave like back-office operating windows, not generic notes.

## How To Start Work

### Option A: Start from the Accounting Dashboard

Use this when:

- you are working aging, balances, WIP, or warranty queues
- you need to pick the next job from a department-wide board

Steps:

1. Open `Accounting`
2. Review the queue boards
3. Click the right row
4. Confirm the customer, VIN, and active RO
5. Continue in the accounting workspace

### Option B: Start from the Active RO

Use this when:

- the service job is already open
- you are posting or reviewing accounting against the live job

Steps:

1. Open the customer in `Accounting`
2. Confirm the correct RO is active
3. Use the accounting quick actions or create bar

## Accounting Desk Workflow

### 1. Create AR Invoice

Use this when:

- the RO needs to post into customer receivables
- service or parts billing should become an open customer invoice

Steps:

1. Click `Create AR Invoice`
2. Confirm:
   - invoice number
   - receivable type
   - profit centre
   - amount
   - due date
   - status
3. Save

Expected result:

- the receivable is posted against the customer and RO
- it becomes visible in aging and due boards

### 2. Create AP Bill

Use this when:

- the dealership owes a vendor or supplier
- parts, service-body-paint, or other supplier costs need tracking

Steps:

1. Click `Create AP Bill`
2. Enter:
   - vendor
   - invoice number
   - payable type
   - profit centre
   - amount
   - due date
   - status
3. Save

Expected result:

- the payable enters the AP board
- the job keeps a visible supplier liability trail

### 3. Apply Customer Payment

Use this when:

- the customer pays on the RO
- accounting needs a visible cash receipt and payment trail

Steps:

1. Click `Apply Payment`
2. Enter:
   - payment amount
   - payment method
   - receipt reference
   - posting status
   - notes
3. Save

Expected result:

- the accounting entry is posted against the RO
- the payment appears in the accounting workflow trail
- the desk can continue toward reconciliation

### 4. Mark AP Paid / Ready

Use this when:

- AP has been approved, paid, held, or needs further review

Steps:

1. Click `Settle AP`
2. Confirm or enter:
   - AP invoice number
   - vendor
   - settlement status
   - amount
   - payment date
   - notes
3. Save

Expected result:

- the supplier settlement posture is recorded
- the accounting review queue has a visible follow-through item

### 5. Post / Review WIP

Use this when:

- you need to review labour, parts, and sublet before posting
- WIP needs to be visible by profit centre and pay type

Steps:

1. Click `Post / Review WIP`
2. Enter:
   - profit centre
   - pay type
   - labour amount
   - parts amount
   - sublet amount
   - WIP status
   - notes
3. Save

Expected result:

- WIP review is logged into the accounting trail
- the office can follow the posting or review step from the same RO

### 6. Advance Warranty Receivable

Use this when:

- a warranty claim moves from submitted to approved or posted

Steps:

1. Click `Advance Warranty Receivable`
2. Confirm:
   - claim number
   - manufacturer
   - receivable status
   - amount
   - notes
3. Save

Expected result:

- warranty receivable posture is recorded
- the accounting desk can follow the claim without leaving the RO context

### 7. Queue Reconciliation Review

Use this when:

- the job needs back-office review before closeout
- there is a statement, cash, WIP, or month-end question

Steps:

1. Click `Queue Reconciliation`
2. Choose:
   - review type
   - due date
   - notes
3. Save

Expected result:

- a real accounting task is created
- the review appears in accounting workflow and can be worked later

## Recommended Operating Rules

### Keep accounting tied to the RO

Do not move important accounting decisions into isolated spreadsheets or side notes if they belong to the live job.

### Use AR and AP as separate desks

- `AR` for customer-facing receivables, invoices, and collections
- `AP` for supplier obligations and vendor settlement

### WIP should be reviewed before it is forgotten

If a job is open and accounting value is building:

- review WIP
- log the labour, parts, and sublet posture
- keep the posting trail visible

### Warranty is not complete when the service claim is submitted

Accounting still needs:

- receivable posture
- approved amount
- posted status
- follow-through

### Reconciliation should be explicit

If the accounting team has to come back to a job later:

- queue a reconciliation review
- do not rely on memory alone

## Daily Accounting Checklist

Start of day:

1. open `Accounting`
2. review `AR Aging`
3. review `AP Aging`
4. review `Open WIP`
5. review `Warranty Receivables`
6. review `AR Due` and `AP Due`

During the day:

1. post AR invoices
2. post AP bills
3. apply customer payments
4. update WIP
5. advance warranty receivables
6. queue reconciliation items that need another pass

End of day:

1. clear customer payments that were applied
2. confirm AP settlement posture is current
3. review any open WIP
4. confirm warranty receivable follow-through
5. leave clear reconciliation tasks for any work still pending

## Troubleshooting

### I cannot tell which customer the accounting item belongs to

Check:

- the selected customer
- the selected VIN
- the active RO

### A payment or AP action is not obvious on the desk

Use the accounting popup window so the workflow is recorded, not just discussed or written outside the system.

### WIP still feels open but no one knows why

Use `Post / Review WIP` and record the actual labour, parts, sublet, and pay-type posture.

### Warranty is stuck

Use `Advance Warranty Receivable` and move the claim to the next clear accounting status.

## Training Walkthrough

Use this script with a new accounting user:

1. open a customer with an active RO
2. create an AR invoice
3. create an AP bill
4. apply a customer payment
5. post or review WIP
6. advance a warranty receivable
7. queue a reconciliation review

If the user can complete that flow confidently, the accounting desk is ready for MVP use.
