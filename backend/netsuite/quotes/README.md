# NetSuite RESTlet Overview: `allQuotes.js` & `topperQuotes.js`

## Purpose

Both `allQuotes.js` and `topperQuotes.js` are **NetSuite SuiteScript 2.1 RESTlets** that **accept POST requests from Shopify quote forms** and automatically:

1. **Find or create a Customer** record in NetSuite based on email.
2. **Create an Estimate (Quote)** linked to that customer.
3. **Return the internal IDs** of the created/updated records.

They are designed for **lead capture and quote generation** from e-commerce quote request forms.

---

## How It Works (Step-by-Step)

### 1. **Customer Lookup or Creation**

- **Input Required**: `email`
- **Search**: Looks for an existing Customer with the same email.
- **If Found**:
  - Updates: `phone`, `first_name`, `last_name` (if provided)
  - Adds a **new non-billing address** (if address data is sent)
  - Saves the updated customer
- **If Not Found**:
  - Creates a **new Customer** record with:
    - First/Last Name
    - Email
    - Phone
    - **Comments**: `"Created via Shopify [General] Quote form."`
    - **Default billing address** (if address data provided)

> Uses **dynamic record mode** for efficient sublist handling (addressbook).

---

### 2. **Estimate (Quote) Creation**

- **Record Type**: `Estimate`
- **Custom Form**: Hardcoded to `229`
- **Fields Set**:
  - `entity` → Customer Internal ID
  - `memo` → Descriptive note including SKU, quantity/vehicle, and message
  - **Billing address fields** (if address provided)

---

## `allQuotes.js` – General Product Quotes

### Use Case
For **any product** in the catalog where customers request a quote.

### Key Features
- **Supports variable quantity** (`data.quantity`, defaults to 1)
- **SKU-based item lookup**
- **No vehicle context**

### Memo Example
```text
Shopify General Quote: Need bulk pricing (ABC123), Quantity: 5
```


### Input Example
```json
{
  "email": "customer@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "sku": "PART-789",
  "quantity": 3,
  "message": "Interested in wholesale"
}
```

## `topperQuotes.js` – Vehicle Topper / Fitment Quotes

### Use Case
Specifically for **truck toppers**

### Key Features
- **Quantity fixed to 1
- **Captures vehicle details:**
    - Make (e.g., FORD → maps to ID 3)
    - Model (e.g., F-150 → maps to ID 8)
    - Year (looked up in custom list `customlist_nscs_model_year`)
    - VIN (optional)
- *Sets custom fields on Estimate:**
    - `custbody_nscs_vehicle_make`
    - `custbody_nscs_vehicle_model`
    - `custbody_nscs_vehicle_year`
    - `custbody_nscs_vehicle_vin`

### Memo Example
```text
Shopify Quote: Color match needed (LEER100XR: FORD F-150)
```


### Input Example
```json
{
  "email": "driver@example.com",
  "sku": "LEER100XR",
  "vehicle_make": "FORD",
  "vehicle_model": "F-150",
  "vehicle_year": "2023",
  "vin_number": "1FTFW1E59NFA12345"
}
```

```markdown
# NetSuite RESTlet Overview: `allQuotes.js` & `topperQuotes.js`

## Purpose

Both `allQuotes.js` and `topperQuotes.js` are **NetSuite SuiteScript 2.1 RESTlets** that **accept POST requests from Shopify quote forms** and automatically:

1. **Find or create a Customer** record in NetSuite based on email.
2. **Create an Estimate (Quote)** linked to that customer.
3. **Return the internal IDs** of the created/updated records.

They are designed for **lead capture and quote generation** from e-commerce quote request forms.

---

## How It Works (Step-by-Step)

### 1. **Customer Lookup or Creation**

- **Input Required**: `email`
- **Search**: Looks for an existing Customer with the same email.
- **If Found**:
  - Updates: `phone`, `first_name`, `last_name` (if provided)
  - Adds a **new non-billing address** (if address data is sent)
  - Saves the updated customer
- **If Not Found**:
  - Creates a **new Customer** record with:
    - First/Last Name
    - Email
    - Phone
    - **Comments**: `"Created via Shopify [General] Quote form."`
    - **Default billing address** (if address data provided)

> Uses **dynamic record mode** for efficient sublist handling (addressbook).

---

### 2. **Estimate (Quote) Creation**

- **Record Type**: `Estimate`
- **Custom Form**: Hardcoded to `229`
- **Fields Set**:
  - `entity` → Customer Internal ID
  - `memo` → Descriptive note including SKU, quantity/vehicle, and message
  - **Billing address fields** (if address provided)

---

## `allQuotes.js` – General Product Quotes

### Use Case
For **any product** in the catalog where customers request a quote.

### Key Features
- **Supports variable quantity** (`data.quantity`, defaults to 1)
- **SKU-based item lookup**
- **No vehicle context**

### Memo Example
```
Shopify General Quote: Need bulk pricing (ABC123), Quantity: 5
```

### Input Example
```json
{
  "email": "customer@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "sku": "PART-789",
  "quantity": 3,
  "message": "Interested in wholesale"
}
```

---

## `topperQuotes.js` – Vehicle Topper / Fitment Quotes

### Use Case
Specifically for **truck toppers, camper shells, or vehicle-specific accessories**.

### Key Features
- **Quantity fixed to 1**
- **Captures vehicle details**:
  - Make (e.g., FORD → maps to ID `3`)
  - Model (e.g., F-150 → maps to ID `8`)
  - Year (looked up in custom list `customlist_nscs_model_year`)
  - VIN (optional)
- **Sets custom fields on Estimate**:
  - `custbody_nscs_vehicle_make`
  - `custbody_nscs_vehicle_model`
  - `custbody_nscs_vehicle_year`
  - `custbody_nscs_vehicle_vin`

### Memo Example
```
Shopify Quote: Color match needed (LEER100XR: FORD F-150)
```

### Input Example
```json
{
  "email": "driver@example.com",
  "sku": "LEER100XR",
  "vehicle_make": "FORD",
  "vehicle_model": "F-150",
  "vehicle_year": "2023",
  "vin_number": "1FTFW1E59NFA12345"
}
```

---

## POST Response (Both Scripts)

**Success**:
```json
{
  "success": true,
  "customerId": 1234,
  "estimateId": 5678
}
```

**Error**:
```json
{
  "success": false,
  "error": "Email is required for customer creation"
}
```

> All errors are logged with full context (message, stack, input data).

---

## Deployment Notes

- **Script Type**: `Restlet`
- **API Version**: `2.1`
- **Entry Point**: `post` function
- **Deployed in NetSuite** → Must be exposed via a **RESTlet deployment URL**
- **Called from Shopify** via form submission (e.g., using JavaScript/fetch)

---

## Summary

| Script | Purpose | Quantity | Vehicle Data | Memo Includes |
|-------|--------|----------|--------------|---------------|
| `allQuotes.js` | General product quotes | Variable | No | SKU + Quantity |
| `topperQuotes.js` | Truck topper quotes | Always 1 | Yes (Make, Model, Year, VIN) | SKU + Vehicle |

> **Both are secure, robust, and follow NetSuite best practices with error handling and logging.**


