# Corporate Markup Configuration (Super Admin)

This document outlines the architecture and CRUD operations for managing Corporate Markups (Flights & Hotels) from the Super Admin panel.

## Overview
The Markup Engine allows Super Admins to define highly granular, hierarchical pricing rules for individual Corporate entities. These markups are applied automatically by the backend pricing engine during flight and hotel searches/bookings.

The frontend interface for managing these rules is located primarily in:
- `MarkupEngine.jsx`: Displays a list of all onboarded corporates and provides access to view or configure their markups.
- `CorporateMarkupList.jsx`: Displays all configured rules for a specific corporate in a responsive card grid layout.
- `CorporateMarkupConfiguration.jsx`: The creation and editing form where Super Admins define the exact criteria and values of the markup rules.

---

## 1. Create (Add New Rule)
When a Super Admin clicks **"Add New Rules"**, they are taken to the `CorporateMarkupConfiguration` component.

### Workflow:
1. **Product Type Selection**: Choose between **Flight** or **Hotel**.
2. **Category Selection**: Choose the classification of the rule.
   - *Flight Categories*: Airline Wise, Sector Wise, Fare Slab Based, Passenger Wise, Date Wise, Booking Time Wise, Generic.
   - *Hotel Categories*: Star Rating Wise, City Wise, Room Type Wise, Generic.
3. **Criteria Definition**: Depending on the selected category, dynamic input fields are rendered. 
   - *Example*: If "Airline Wise" is selected, an input field for "Airline Code" (e.g., `6E`, `AI`) appears.
   - *Validation*: The system prevents duplicate criteria for the same category (e.g., if a rule for `6E` already exists, it blocks adding another `6E` rule for that corporate).
4. **Markup Definition**:
   - **Type**: Percentage (`%`) or Flat Amount (`₹`).
   - **Value**: The numerical value to apply.
   - *Fare Slab Handling*: If "Fare Slab Based" is chosen, the admin defines multiple tiered ranges (e.g., ₹0 - ₹5000 -> ₹200 markup; ₹5001 - ₹10000 -> ₹400 markup).
5. **Save**: The frontend dispatches `saveCorporateMarkup` (via Redux), which sends a POST/PUT request to the backend with the structured rule payload.

---

## 2. Read (View Rules)
Super Admins can view existing rules in the `CorporateMarkupList.jsx` page by clicking the **"View"** button on the main Markup Engine list.

### Workflow:
- The backend returns the `markupDoc` for the specific corporate, organized by `productType` (Flight/Hotel).
- The rules are mapped out into a **Card Grid Layout**.
- Each card displays:
  - **Category**: (e.g., "Airline Wise")
  - **Criteria Target**: (e.g., "Airline Code: SG")
  - **Markup Value**: The exact amount or percentage to apply.
- If no rules exist for a category, a graceful empty state is shown.

---

## 3. Update (Edit Rule)
Super Admins can modify existing rules by hovering over a rule card and clicking the **Edit** icon.

### Workflow:
1. The user is redirected back to `CorporateMarkupConfiguration.jsx` in **Edit Mode**.
2. The form is pre-filled with the existing rule's data (Product Type, Category, Criteria, Markup Value/Slabs).
3. The Admin adjusts the markup value, method, or slabs. (Note: Category and Criteria are often locked during edit to maintain data integrity; if criteria must change, the rule is usually recreated).
4. Upon clicking "Update Rule", the specific index of the `rules` array in the `markupDoc` is updated locally.
5. The full modified array is sent to the backend via `saveCorporateMarkup`, acting as an Upsert (Update).

---

## 4. Delete (Remove Rule)
Super Admins can delete either a specific rule or an entire product configuration.

### Workflow:
1. **Delete Specific Rule**: 
   - Clicking the **Trash** icon on a specific rule card opens a custom Confirmation Modal.
   - The modal displays the exact Category and Criteria of the rule being deleted.
   - Upon confirmation, the rule is spliced out of the `rules` array. 
   - The updated array is sent to the backend. If the array becomes empty, the system automatically triggers a full document deletion for that product type.
2. **Delete Entire Product Type**:
   - The admin can click a global "Delete" button to wipe all rules for a specific product type (e.g., deleting all Flight rules for Corporate X).
   - This fires the `deleteCorporateMarkup` action, calling the DELETE endpoint on the backend.

---

## Data Structure Example
The payload structure exchanged with the backend looks like this:

```json
{
  "corporateId": "65b89a...",
  "productType": "flight",
  "isActive": true,
  "rules": [
    {
      "category": "Airline Wise",
      "criteria": {
        "airlineCode": "6E"
      },
      "markupMethod": "flat",
      "markupValue": 250,
      "fareSlabs": []
    },
    {
      "category": "Fare Slab Based",
      "criteria": {},
      "markupMethod": "flat",
      "markupValue": 0,
      "fareSlabs": [
        { "from": 0, "to": 5000, "method": "flat", "value": 150 },
        { "from": 5001, "to": 10000, "method": "flat", "value": 300 }
      ]
    }
  ]
}
```

## State Management
- **Redux Slice**: `markupSlice.js` (or similar) handles fetching, saving, and deleting documents.
- **Local State**: Managed via `useState` for form fields, active tabs, and modal visibility.
- **Routing State**: React Router's `useLocation().state` is used to pass the `corporate` metadata and `editMode` context seamlessly between the List and Configuration pages.
