# INGRID DMS Object Map

This document turns the legacy iDMS structure into a practical object model for the current INGRID build.

The goal is simple:

- keep the current INGRID stack
- avoid copying the legacy architecture
- adopt the right dealership business objects
- make each department work on its own records, not generic tasks

## Core Principle

INGRID should treat these as first-class DMS objects:

1. `Customer`
2. `Vehicle`
3. `Appointment`
4. `Service Reception / Write-Up`
5. `Repair Order`
6. `Service Quote`
7. `Parts Quote`
8. `Picking`
9. `Service Invoice`
10. `Parts Invoice`

Tasks, notes, timeline events, and media should support these records, not replace them.

## Legacy-to-INGRID Mapping

| Legacy iDMS object | Current INGRID equivalent | Recommended INGRID object | Keep / change |
| --- | --- | --- | --- |
| `MasterData_Person` / `CRM_Customer` | `CustomerRecord` | `Customer` | Keep customer core, add clearer CRM/customer split later only if needed |
| Vehicle catalog / service vehicle references | `VehicleRecord` | `Vehicle` | Keep, but strengthen ownership + service linkage |
| `BookAppointments` / `ServiceAppointmentsController` | `AppointmentRecord` | `Appointment` | Keep, but make appointment the only booking object |
| `ServiceReception` | currently mixed into appointment + RO + notes | `ServiceReception` | Add as a new object |
| `Order` | `RepairOrderRecord` | `RepairOrder` | Keep, but make it explicitly downstream from reception |
| `Quotation` | estimate lines / part lines on RO | `ServiceQuote`, `PartsQuote` | Add as real objects |
| `PickingList` | parts task / special order workflow | `Picking` | Add as a real parts execution object |
| invoice / checkout flow in `OrdersController` | AR/AP invoices and accounting entries | `ServiceInvoice`, `PartsInvoice` | Add explicit invoice types |
| `ServiceReceptionInspection` / vehicle inspection objects | MPI items on RO | `Inspection` | Keep current RO MPI support, but attach it to reception/RO more clearly |
| service reception attachments | media assets | `MediaAsset` | Keep current media model and scope it to reception/RO/archive |

## Recommended INGRID Workflow

### Service Flow

1. `Create Customer`
2. `Create Vehicle`
3. `Create Appointment`
4. `Create Service Reception`
5. `Open Repair Order from Service Reception`
6. `Create Service Quote`
7. `Dispatch Labor`
8. `Complete MPI`
9. `Create Parts Quote`
10. `Create Picking`
11. `Create Service Invoice`
12. `Close RO`

### Parts Flow

1. `Create Part`
2. `Create Parts Quote`
3. `Create Special Order`
4. `Create Picking`
5. `Receive / Stage / Deliver`
6. `Create Parts Invoice`

### Accounting Flow

1. read `Service Invoice` and `Parts Invoice`
2. create or link `AR`
3. create or link `AP`
4. reconcile payments and vendor bills
5. close accounting period later as a separate process

## Department Ownership

| Object | Primary owner | Secondary owners |
| --- | --- | --- |
| `Customer` | BDC, Sales, Service | Accounting |
| `Vehicle` | Sales, Service | Technicians, Parts |
| `Appointment` | BDC, Service, Sales | Advisors |
| `ServiceReception` | Service Advisor | Technician |
| `RepairOrder` | Service Advisor | Technician, Parts, Accounting |
| `ServiceQuote` | Service Advisor | Technician |
| `PartsQuote` | Parts | Service Advisor |
| `Picking` | Parts | Technician |
| `ServiceInvoice` | Accounting | Service Advisor |
| `PartsInvoice` | Accounting, Parts | Service Advisor |

## Current INGRID Backend Surfaces

These already exist and should be reused where possible:

### Existing backend objects / endpoints

- `Customer`
  - `Controllers/DmsController.cs`
- `Vehicle`
  - `Controllers/DmsController.cs`
- `Appointment`
  - `Controllers/AppointmentsController.cs`
  - `Services/AppointmentsService.cs`
- `RepairOrder`
  - `Controllers/ServiceOperationsController.cs`
  - `Services/ServiceOperationsService.cs`
- `Estimate line`
  - current backend support inside service operations
- `Part line`
  - current backend support inside service operations
- `Labor op`
  - current backend support inside service operations
- `MPI`
  - current backend support inside service operations
- `Warranty claim`
  - current backend support inside service operations
- `Pay split`
  - current backend support inside service operations
- `Parts inventory / orders`
  - `Controllers/PartsManagementController.cs`
  - `Services/PartsManagementService.cs`
- `AR / AP / GL`
  - `Controllers/AccountingOperationsController.cs`
  - `Services/AccountingOperationsService.cs`
- `Media`
  - `Controllers/MediaAssetsController.cs`
  - `Services/MediaAssetService.cs`

### Existing frontend proxies

- `customers-create.mjs`
- `vehicles-create.mjs`
- `service-repair-order-open.mjs`
- `service-repair-order-estimate-line.mjs`
- `service-repair-order-part-line.mjs`
- `service-repair-order-labor-op.mjs`
- `service-repair-order-inspection.mjs`
- `service-repair-order-warranty-claim.mjs`
- `service-repair-order-pay-split.mjs`
- `parts-order-create.mjs`
- `accounting-ar-invoice-create.mjs`
- `accounting-ap-bill-create.mjs`

## Current Gaps

These are the main places where INGRID still collapses real DMS objects into generic actions.

### Gap 1: Service reception does not exist

Right now:

- appointment and RO are too close together
- write-up behavior is split across notes, appointments, and RO creation

Recommendation:

- add a real `ServiceReception` object
- make `Open RO` downstream from `ServiceReception`

### Gap 2: Quotes are still line-item behavior, not quote records

Right now:

- `Service Quote` is really an estimate-line create
- `Parts Quote` is really a part-line create

Recommendation:

- keep current line-item endpoints for speed
- add top-level `Quote` records later:
  - `ServiceQuote`
  - `PartsQuote`
- each quote should own line items, status, approval, printed form, and conversion to invoice

### Gap 3: Picking does not exist as its own object

Right now:

- pick/source work is task-driven

Recommendation:

- add a `Picking` object for parts execution
- tie it to:
  - `RepairOrder`
  - `PartsQuote`
  - `SpecialOrder`

### Gap 4: Invoices are accounting-first, not business-first

Right now:

- AR/AP exist
- but `Service Invoice` and `Parts Invoice` are mostly UI labels over AR/AP creation

Recommendation:

- create explicit invoice records in the domain
- map them to AR/AP posting afterward

## Recommended Build Order

### Phase 1: Canonical Create Flows

These should be polished first:

1. `Create Customer`
2. `Create Vehicle`
3. `Create Appointment`
4. `Create Service Reception`
5. `Open RO`

### Phase 2: Service Execution

1. `Create Service Quote`
2. `Dispatch Labor`
3. `Clock In / Clock Out`
4. `Complete MPI`
5. `Add Media`
6. `Warranty Claim`
7. `Pay Split`

### Phase 3: Parts Execution

1. `Create Parts Quote`
2. `Create Special Order`
3. `Create Picking`
4. `Receive / Stage / Deliver`
5. `Create Parts Invoice`

### Phase 4: Accounting Closure

1. `Create Service Invoice`
2. `Create Parts Invoice`
3. `Post AR`
4. `Post AP`
5. `Reconcile`

## Immediate Next Implementation Targets

These are the highest-value next additions to the current codebase.

### Backend

Add first-class objects for:

- `ServiceReception`
- `ServiceQuote`
- `PartsQuote`
- `Picking`
- `ServiceInvoice`
- `PartsInvoice`

### Frontend

Add dedicated dashboard create actions and boards for:

- `Service Reception`
- `Service Quote`
- `Parts Quote`
- `Picking`
- `Service Invoice`
- `Parts Invoice`

### UX Rules

- each department should create only the records it owns
- every create button should create a real object, not preload a template
- every queue should list real records, not inferred tasks where a domain object should exist
- tasks should remain for handoffs and personal work, not act as a substitute for core DMS records

## Simple Rule of Thumb

If a dealership would print it, quote it, invoice it, dispatch it, or reconcile it, it should probably be its own object in INGRID.
