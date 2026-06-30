# Corporate Markup Configuration Engine

## Overview
The Corporate Markup Configuration Engine allows super-admins to define pricing rules that apply markups to Flight and Hotel searches across different corporates. 

These rules run dynamically during searches to recalculate the pricing before returning it to the user.

## Core Entities

### 1. `CorporateMarkup` Model
Location: `server/src/models/markup.js`

This is the central model for defining rules. It specifies:
* `corporateId`: Which corporate the rule applies to (`ALL` for global, or specific Corporate ID).
* `serviceType`: `flight` or `hotel`.
* `markupType`: `percentage` or `fixed`.
* `markupValue`: The actual value to add.
* `priority`: Rule priority (higher priority wins when resolving conflicts).
* `status`: `active` or `inactive`.
* `conditions`: Granular filtering.

**Flight Conditions:**
* `airlines`: Specific airlines (e.g., `["6E", "AI"]`).
* `fareClasses`: Allowed fare classes (e.g., `["Economy", "Business"]`).
* `routingType`: `domestic`, `international`, or `all`.

**Hotel Conditions:**
* `hotelCodes`: Specific hotel IDs.
* `destinations`: Specific destination cities.
* `starRatings`: Applicable star ratings (e.g., `[4, 5]`).

---

## CRUD Operations (Super Admin)
Location: `server/src/controllers/markup.controller.js` (Existing)

### 1. Create a Markup Rule
**Endpoint:** `POST /api/v1/markup`
**Role:** Super Admin

**Payload Example (Flight - Fixed Amount):**
```json
{
  "corporateId": "651a2b3c4d5e6f7g8h9i0j11",
  "serviceType": "flight",
  "markupType": "fixed",
  "markupValue": 500,
  "priority": 10,
  "conditions": {
    "flight": {
      "airlines": ["6E", "AI"],
      "routingType": "domestic"
    }
  }
}
```

**Payload Example (Hotel - Percentage):**
```json
{
  "corporateId": "ALL",
  "serviceType": "hotel",
  "markupType": "percentage",
  "markupValue": 5,
  "priority": 5,
  "conditions": {
    "hotel": {
      "starRatings": [4, 5]
    }
  }
}
```
**Audit Hook:** Creating a rule automatically triggers the `MarkupAuditService` to log the creation, tracking `createdBy` and the `changes`.
**Cache Hook:** Clears the Redis cache (`markup:corp:{id}:{type}`) so the new rules are applied on the next search.

### 2. Get Markup Rules
**Endpoint:** `GET /api/v1/markup`
**Role:** Super Admin

**Query Params:** 
* `corporateId` (Filter by corporate)
* `serviceType` (`flight` or `hotel`)
* `status` (`active` or `inactive`)

### 3. Update a Markup Rule
**Endpoint:** `PUT /api/v1/markup/:id`
**Role:** Super Admin

* **Usage:** Updates fields like `markupValue`, `priority`, or `conditions`.
* **Audit Hook:** Triggers `MarkupAuditService` with `action: 'UPDATE'` and records the exact diff in `changes`.
* **Cache Hook:** Invalidates the Redis cache for the affected corporate ID to ensure real-time application.

### 4. Delete / Deactivate a Markup Rule
**Endpoint:** `DELETE /api/v1/markup/:id`
**Role:** Super Admin

* **Usage:** Soft deletes or changes the `status` to `inactive`.
* **Audit Hook:** Triggers `MarkupAuditService` with `action: 'DELETE'`.
* **Cache Hook:** Invalidates the Redis cache.

---

## How It Applies in the Booking Flow

1. **Search Phase (`flight.service.js` & `hotel.service.js`)**
   When a search is requested, the system:
   * Fetches the corporate ID and service type.
   * Hits the `MarkupCacheService` to retrieve active rules (cached in Redis for fast lookup).
   * Iterates through all supplier results and passes them to `MarkupResolverService`.
   * Evaluates the conditions (e.g., checking if the airline matches). The rule with the highest `priority` wins.
   * Applies the markup using `MarkupCalculatorService` (modifying the `PublishedFare`).
   * Saves a lightweight "snapshot" object with the results (`markupAmount`, `supplierFare`, `finalFare`) to avoid re-running rules on the frontend.

2. **Fare Quote / Re-pricing Phase**
   The frontend passes back the `snapshot` data. The system uses the snapshot to maintain consistency, avoiding re-calculation unless the base fare has fundamentally changed. 

3. **Booking Phase**
   When the booking is finally confirmed (via `BookingRequest`), the `markupSnapshot` is attached to the booking model. 
   The `MarkupRevenueService` fires an event to log the exact `markupAmount` into the `MarkupRevenue` database for financial reconciliation and tracking.
