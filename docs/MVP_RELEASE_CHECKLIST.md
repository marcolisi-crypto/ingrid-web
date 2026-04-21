# INGRID DMS MVP Release Checklist

This checklist is the freeze-line document for the current MVP.

Its purpose is to:

- define what is considered in-scope for MVP release
- document the department desks that are ready
- identify the final QA expectations
- make post-MVP work explicit so scope does not keep drifting

## MVP Release Goal

Deliver a usable dealership DMS MVP with:

- department dashboards
- customer and VIN spine
- service / fixed ops desk
- parts desk
- accounting desk
- real create windows for the core operating records
- role-aware workflows and manuals

## In Scope for MVP

### Master Records

- `Customer`
- `Vehicle`
- `Appointment`
- `Service Write-Up`
- `Repair Order`

### Service / Fixed Ops

- create appointment
- create write-up
- open RO
- update RO control
- service quote
- quote approval / decline
- labor dispatch
- technician clock in/out
- MPI
- warranty claim
- pay split
- transport / loaner
- ETA / promised time
- service invoice
- close RO

### Parts

- parts quote
- source / bin control
- special order
- ETA update
- arrival / ready-to-deliver states
- approval / decline
- declined follow-up
- parts invoice

### Accounting

- AR invoice
- AP bill
- accounting entry
- apply customer payment
- AP settlement follow-through
- WIP review / posting workflow
- warranty receivable follow-through
- reconciliation review queue

### Dashboards

- department launcher / dashboards
- service queues
- technician queues
- parts queues
- accounting queues
- row drill-in from dashboard to live customer context

### Documentation

- service / fixed ops user manual
- parts user manual
- accounting user manual
- user manual index

## Final QA Pass

### Service

Verify:

1. create appointment
2. create write-up
3. open RO
4. update RO control
5. create service quote
6. send quote by SMS / email
7. record approval / decline
8. dispatch labor
9. add MPI
10. send MPI to advisor
11. add warranty claim
12. add pay split
13. update transport
14. update ETA
15. create service invoice
16. close RO

### Technicians

Verify:

1. clock in
2. clock out
3. add labor op
4. add MPI
5. capture photo
6. capture video

### Parts

Verify:

1. create parts quote
2. source / bin control
3. create special order
4. update ETA
5. mark arrived
6. mark ready to deliver
7. send approval
8. record wet signature
9. mark declined
10. queue declined follow-up
11. create parts invoice

### Accounting

Verify:

1. create AR invoice
2. create AP bill
3. post accounting entry
4. apply customer payment
5. mark AP settled
6. review / post WIP
7. advance warranty receivable
8. queue reconciliation review

### Dashboard Behavior

For each department verify:

1. rows are interactive
2. clicking a row drills into the correct customer context
3. create actions open proper DMS windows
4. after save, the user lands in the correct desk or artifact
5. queue counts and queue rows refresh in a believable way

## Ship Criteria

MVP is ready to ship when:

- the core service desk flow works end to end
- the parts desk flow works end to end
- the accounting desk flow works end to end
- no major create buttons feel dead or misleading
- department dashboards drill cleanly into the right customer and job
- user manuals exist for the operating desks

## Known Post-MVP Work

These items are intentionally outside the MVP freeze:

- deeper first-class CRM / deal objects for BDC and Sales
- more structured backend persistence for every rich accounting detail field
- deeper GL setup / statement configuration workflows
- richer service line-item editing inside the open RO itself
- expanded reporting, month-end, and close controls
- broader manager analytics and executive reporting

## Release Freeze Rule

After this checklist is accepted:

- only fix real usability bugs
- do not add new modules
- do not expand scope unless it blocks MVP use

That keeps the release focused on shipping the desks that users will actually work from every day.
