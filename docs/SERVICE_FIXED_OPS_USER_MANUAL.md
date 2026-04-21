# INGRID DMS Service / Fixed Ops User Manual

This guide is for service advisors, service managers, technicians, parts staff, and fixed-ops support users working inside the INGRID DMS MVP.

The goal is simple:

- show where to start
- explain what each service screen is for
- give step-by-step operating instructions
- make sure users know which record to create next

This is a working manual for day-to-day use, not a technical design document.

## Who This Manual Is For

Primary users:

- Service Advisor
- Service Manager
- Technician
- Parts Counter
- Accounting support for service invoices and RO follow-through

Primary workflows:

1. create appointment
2. create write-up
3. open repair order
4. dispatch labor and MPI
5. send and track approvals
6. manage transport and ETA
7. invoice and close the RO

## Core Record Flow

In INGRID, service work should move in this order:

1. `Customer`
2. `Vehicle`
3. `Appointment`
4. `Service Write-Up`
5. `Repair Order (RO)`
6. `Service Quote`
7. `Labor / MPI / Parts / Warranty / Pay Split`
8. `Service Invoice`
9. `Close RO`

Important rule:

- do not skip the customer and vehicle spine
- if the customer or VIN is wrong, everything downstream becomes harder to fix

## Main Service Screens

### 1. Service Dashboard

Use this when you need to find the next job to work.

Expected queues include:

- `My Appointments`
- `My Write-Ups`
- `My Open ROs`
- `Write-Ups Waiting`
- `Open ROs`
- `Waiting Approval`
- `Ready Today`
- `Clocked-In Jobs`
- `Warranty Follow-Through`

Use the dashboard to drill into the right customer before doing detailed advisor work.

### 2. Service Advisor Workspace

Use this when you are actively working one customer and one vehicle.

The advisor workspace is organized as:

- top header for customer, vehicle, status, appointment, and quick contact actions
- left timeline / interaction feed
- center work order area
- right financial and approval rail
- bottom scheduling and next steps
- sticky fixed-ops actions

### 3. DMS Popups / Action Windows

Use these for real record creation and updates.

Examples:

- `Create Appointment`
- `Create Service Write-Up`
- `Open RO`
- `Update RO Control`
- `Create Service Quote`
- `Dispatch Labor`
- `Add MPI`
- `Warranty Claim`
- `Set Pay Split`
- `Create Service Invoice`

These windows should be treated like your working transaction forms.

## How To Start Work

### Option A: Start from the Service Dashboard

Use this when:

- you are working storewide queues
- you need to pick the next customer from appointments, write-ups, or open ROs

Steps:

1. Open `Service`
2. Review the queue boards
3. Click the correct row
4. Confirm the customer and vehicle loaded in the advisor workspace
5. Continue the workflow from there

### Option B: Start from a Create Window

Use this when:

- the customer walks in
- the advisor needs to create a new service event from scratch

Important:

- `Create Appointment` and `Open RO` now include `Customer` and `Vehicle / VIN` selectors inside the popup
- users can start from the customer
- or choose the vehicle/VIN row and let the system derive the owning customer

## Customer And VIN Selection Rules

When opening a new appointment or RO:

1. choose the `Customer`
2. choose the `Vehicle / VIN`
3. if no vehicle is available yet, continue as a walk-in when allowed
4. verify the customer and VIN before saving

Recommended advisor practice:

- if the customer already exists, use the existing record
- if the vehicle already exists, choose the existing VIN
- only create a new customer or vehicle when you are sure it does not already exist

## Service Advisor Workflow

### 1. Create Appointment

Use this for:

- booked service visit
- advisor commitment
- future promised arrival

Steps:

1. Click `Create Appointment`
2. Select customer
3. Select vehicle / VIN
4. Enter:
   - appointment type
   - advisor
   - date
   - time
   - transport
   - notes
5. Save

Expected result:

- the appointment appears on the service dashboard
- the customer workspace should stay in service context

### 2. Create Service Write-Up

Use this when the vehicle has arrived and the advisor is checking the customer in.

Steps:

1. Open the customer in `Service`
2. Click `Create Write-Up`
3. Confirm:
   - customer
   - vehicle
   - concern
   - mileage
   - promised time
   - arrival / transport detail
4. Save

Expected result:

- the write-up becomes the intake record between appointment and RO
- it should appear in `Write-Ups Waiting`

### 3. Open Repair Order

Use this when the service job becomes live and needs to be worked by service, technician, parts, and accounting.

Steps:

1. Click `Open RO`
2. Select or confirm:
   - customer
   - vehicle / VIN
3. Enter:
   - advisor
   - complaint / concern
   - mileage in
   - tag / key tag
   - pay type
   - transport
   - promised date / time
   - priority
   - advisor notes
4. Save

Expected result:

- the RO becomes the live working object
- the workspace should remain in `Service`
- the RO should appear in `Open ROs`

### 4. Update RO Control

Use this when any of the advisor-facing control fields change after the RO is already open.

Examples:

- promised time changed
- transport changed
- complaint updated
- status changed
- advisor changed

Steps:

1. Open the active customer and RO
2. Click `Update RO Control` or `Edit RO`
3. Update the fields
4. Save

Expected result:

- the live RO should reflect the new control posture
- the service desk should stay focused on the RO

### 5. Create Service Quote

Use this when labor or diagnostic work needs customer approval.

Service quote windows support multiple lines.

Typical line items:

- diagnostic
- maintenance
- repair labor
- recommended service

Steps:

1. Open the active RO
2. Click `Create Service Quote`
3. Add one or more labor lines
4. Enter:
   - op code
   - description
   - category
   - hours
   - rate
   - line status
5. Save

Expected result:

- lines are added to the active RO quote path
- approval actions become relevant on the advisor rail

### 6. Send Approval And Track Paper Trail

Use this after quote lines are ready.

Supported approval methods:

- SMS
- Email
- E-signature request
- Wet signature
- Declined

Steps:

1. Open the active RO
2. Use the approval actions on the right rail
3. Choose the method
4. enter the required message or note
5. Save

Expected result:

- the action creates a visible approval trail
- declined work should feed service declined workflow
- the approval activity should stay anchored to the RO

### 7. Dispatch Labor

Use this when the advisor or foreman is assigning labor work to the technician side.

Steps:

1. Open the active RO
2. Click `Dispatch Labor`
3. Enter:
   - op code
   - description
   - technician
   - sold hours
   - flat-rate hours
   - actual hours if known
   - dispatch status
   - pay type
4. Save

Expected result:

- the labor op is attached to the RO
- technician lane should reflect the new work

### 8. Add MPI

Use this to record a multi-point inspection item against the active RO.

Steps:

1. Open the active RO
2. Click `Add MPI`
3. Enter:
   - category
   - item
   - result
   - severity
   - technician
   - notes
4. Save

Expected result:

- the MPI item attaches to the RO
- the technician lane and advisor review flow should pick it up

### 9. Send MPI To Advisor

Use this after inspection items are ready for advisor review.

Steps:

1. Open the active RO
2. Click `Send MPI to Advisor`
3. Confirm the action

Expected result:

- a service-facing review task is created
- the advisor has a visible follow-through item

### 10. Warranty Claim

Use this when part or all of the repair work is warranty-covered.

Steps:

1. Open the active RO
2. Click `Warranty Claim`
3. Enter:
   - claim type
   - op code
   - failure code
   - cause
   - correction
   - claim amount
   - status
4. Save

Expected result:

- warranty posture is attached to the RO
- service and accounting can follow warranty progress

### 11. Set Pay Split

Use this when the RO must be divided between customer pay, warranty, internal, or maintenance.

Steps:

1. Open the active RO
2. Click `Set Pay Split`
3. Enter:
   - pay type
   - amount
   - percentage
   - status
   - notes
4. Save

Expected result:

- the split is attached to the RO
- downstream invoicing and accounting should become clearer

### 12. Loaner / Transport

Use this when transportation needs to be managed for the service visit.

Examples:

- loaner
- shuttle
- pickup
- waiter

Steps:

1. Open the active customer or RO
2. Click `Create Loaner` or `Request Transport`
3. Enter:
   - transport type
   - workflow status
   - advisor owner
   - need-by date
   - provider / source
   - transportation notes
4. Save

Expected result:

- the transport workflow is created
- if an appointment exists, transport context should also be reflected there
- if an RO exists, the service record should show the transport change

### 13. Update ETA / Promised Time

Use this whenever the completion promise changes.

Steps:

1. Open the active customer or RO
2. Click `Update ETA`
3. Enter:
   - promised date
   - promised time
   - customer posture
   - next communication method
   - ETA notes
4. Save

Expected result:

- the promised-time trail is updated
- the service record should keep the new ETA context

### 14. Mark Ready

Use this when the service job is ready for final customer handoff.

Steps:

1. Open the active RO
2. Click `Mark Ready`

Expected result:

- the RO status becomes ready
- the service queue should reflect ready posture

### 15. Create Service Invoice

Use this after service work is ready to be billed.

Steps:

1. Open the active RO
2. Click `Create Service Invoice`
3. Confirm:
   - invoice number
   - payment method
   - receivable type
   - subtotal
   - tax
   - fees
   - total
   - due date
4. Save

Expected result:

- service invoice is created
- accounting can follow the receivable

### 16. Close RO

Use this only when the service job is complete and ready to be closed.

Steps:

1. Open the active RO
2. Review the work status
3. Click `Close RO`

Expected result:

- the RO status becomes closed
- the record should remain visible for history and invoicing review

## Technician Workflow

Technicians mainly work through the active RO and technician desk.

Typical technician actions:

- clock in
- clock out
- start labor
- complete labor
- add MPI
- send MPI to advisor
- capture photo / video

Technician rule:

- technician actions should always stay tied to a live RO whenever possible

## Service Manager Workflow

Use the service dashboard to monitor:

- appointments
- write-ups waiting
- open ROs
- waiting approval
- ready today
- clocked-in jobs
- warranty follow-through

Manager use case:

- pick the right queue
- drill into the customer
- review the live advisor workspace
- correct workflow issues from the active RO

## Common Operating Rules

### Rule 1: Always verify customer and VIN first

Wrong customer or wrong VIN creates downstream cleanup work for service, parts, and accounting.

### Rule 2: Open the RO before doing repair work

Labor, MPI, warranty, parts, and invoice work should attach to the live RO.

### Rule 3: Use approval actions for real customer decisions

Do not rely on memory or verbal-only tracking. Use the system actions so there is a visible paper trail.

### Rule 4: Update ETA as soon as promised time changes

The promised time is operational, not decorative.

### Rule 5: Use pay split and warranty correctly before invoicing

This reduces cleanup later in accounting.

## Troubleshooting

### I clicked `Open RO` and do not know what customer to use

- use the customer selector in the popup
- if you know the VIN better than the name, use the `Vehicle / VIN` selector

### I cannot find the vehicle

- check whether the vehicle exists under the customer already
- if not, create the vehicle first

### The job is active but I do not see an RO

- create or open the RO first
- most service execution work should not happen without it

### The quote was sent but I need proof later

- use the built-in approval methods
- review the service record and approval-related follow-up items

### The customer is delayed and needs a new promise

- use `Update ETA / Promised Time`
- do not only add a generic note

### The customer needs a loaner or shuttle

- use the transport workflow window
- do not leave this as an unwritten side conversation

## Suggested Training Walkthrough

For a first-day advisor training session, run this scenario:

1. create customer
2. create vehicle
3. create appointment
4. create write-up
5. open RO
6. create service quote
7. send estimate by SMS
8. record approval
9. dispatch labor
10. add MPI
11. update ETA
12. create service invoice
13. close RO

That sequence teaches the whole fixed-ops spine in one pass.

## MVP Notes

This manual reflects the current MVP behavior.

Current strengths:

- customer and VIN selection in service intake windows
- service write-up and RO flow
- advisor quote and approval actions
- labor, MPI, warranty, pay split, ETA, transport, and close-out flows

Current expectation for users:

- use the RO as the main service record
- use dashboard queues to find work
- use modal windows to create and update records

## Next Documentation Candidates

After service / fixed ops, the next manuals should be:

1. `Parts User Manual`
2. `Accounting User Manual`
3. `Technician User Manual`
4. `Manager Dashboard Guide`
