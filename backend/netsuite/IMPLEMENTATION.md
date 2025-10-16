# Implementation Info
Requirements needed to scave a path to meet acceptance criteria

## Acceptance Criteria
When a user submits a quote request on Shopify

I want the data collected inside of NetSuite

## Clarification Points
1. Where do you want the quote data to go in NetSuite?

    Do you want each quote request to create a lead/prospect record, a custom record, or a sales transaction (Estimate/Quote) in NetSuite?

    Estimate/Quote is the best option

2. What information does your Shopify “Request a Quote” button collect?

    - first_name
    - last_name
    - email
    - phone
    - address
    - state
    - country
    - vehicle_make
    - vehicle_model
    - vehicle_year
    - vin_number
    - message
    - sku

3. Is this data stored in Shopify (e.g., as a draft order, metafield, or in a form app like Hulk, Globo, or a custom HTML form)?

    This data is not stored on shopify, it's created via `Custom Code` in my theme editor (Wookie). Currently, once the data is submitted, the custom HTML form data creates a request to my server that I created on render and is sent to HubSpot via API request. It also sends a generic sales email and customer email alerting both that the submission was sucessful.

4. How do you want the data sent to NetSuite? 
    - Through REST/SOAP web services (direct integration),

    I would like to connect it to my existing server, I just don't want the user have to sign in to submit the quote request to land inside of netsuite. If there is a better option to achieve this, I don't mind ignoring my exisiting server.

    - via middleware (Celigo, Dell Boomi, Workato, etc.),

    I use NetSuite Connector (Far App) for product/order/etc but nothing for inquiries only 

    - or a custom webhook endpoint (RESTlet) hosted in NetSuite?

    I would like to connect it to my existing render server, I just don't want the user have to sign in to submit the quote request to land inside of netsuite. If there is a better option to achieve this, I don't mind ignoring my exisiting server.

5. What version of NetSuite are you using / do you have SuiteScript and SuiteTalk features enabled?

    - Specifically, SuiteCloud → “SuiteScript” and “SOAP/REST Web Services”.
    
    These features are enabled inside of my NetSuite Environment


## Flow Plan
```
Shopify Storefront (Custom Form)
        │
        ▼
Your Server (Render)
        │
        ▼
NetSuite (RESTlet Endpoint)
        │
        ▼
Creates:
- Prospect/Customer (If they do not already exist)
- Estimate/Quote Transaction
```

## STEP 1: Decide What to Create in NetSuite
### Estimate Record

This Estimate Record is a custom form `Field ID: customform` with a value set to `Waldoch Crafts - Quote`

- Only use if you want quotes directly accessible to your sales staff in Transactions > Sales > Quote.

- You’ll need to link to a Customer/Prospect.

- If the customer doesn’t exist, the RESTlet must first create one (using record.create({ type: `record.Type.CUSTOMER` })).

### Field Mapping Reference

| Shopify Field                            | NetSuite Target Field                                | Notes                                 |
| ---------------------------------------- | ---------------------------------------------------- | ------------------------------------- |
| first_name / last_name                   | Customer → firstname / lastname                      |                                       |
| email                                    | Customer → email                                     | Used for lookup                       |
| phone                                    | Customer → phone                                     |                                       |
| address / state / country                | Customer → address subrecord                         | Optional                              |
| sku                                      | Estimate → item sublist                              | Uses itemid lookup                    |
| vehicle_make / model / year / vin_number | Custom body fields (`custbody_...`)                  | Create or find custom body fields on Estimate |
| message                                  | Use Memo |                                       |

#### Custom Body Fields on Estimate
- vehicle_make:
    - Field ID: `custbody_nscs_vehicle_make` 
- vehicle_model:
    - Field ID: `custbody_nscs_vehicle_model`
- vehicle_year: 
    - Field ID: `custbody_nscs_vehicle_year`
- vin_number: 
    - Field ID: `custbody_nscs_vehicle_vin`

#### Note: 

NetSuite allows Estimate creation under a Prospect or Lead, but it still needs a valid customer record.

## STEP 2: Build a SuiteScript 2.1 RESTlet

Example File Name: `/SuiteScripts/ShopifyQuoteRESTlet.js`

Implementation example is located in `RESTlet.js`

### Refinements
1. Customer Lookup / Create Logic

- Before creating an Estimate, the RESTlet must:
    - Search by email address (`record.Type.CUSTOMER`)
    - If found → use existing internalId
    - If not found → create a new record with status Prospect and assign to the Estimate

2. Estimate Creation
- Minimum required fields for an Estimate:
    - `entity` (Customer internalId)
    - `trandate` (Date)
    - `item sublist` → `item`, `quantity`, `rate`, `amount`
- Optional custom body fields: VIN, vehicle details, etc.

3. Item Handling
- Use SKU to lookup the NetSuite Item (`search.lookupFields` on `itemid`)
- Add that line to the `item` sublist.

4. Data Normalization
- Map your Shopify form fields to NetSuite’s standard Estimate fields and/or custom body fields.

## Step 3: Deploy the RESTlet

#### Go to: `Customization → Scripting → Scripts → New`

1. Upload your file.

2. Create Script Record → RESTlet.

3. Add a Script Deployment and set Status: Released.

4 Note down the External URL looks like:
`https://<account>.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=XXX&deploy=1`

## Step 4: Authentication (No User Login Required)

Use Token-Based Authentication (TBA) between your server and NetSuite.

#### Steps:

1. Enable TBA (Setup → Company → Enable Features → SuiteCloud tab).

2. Create an Integration Record (Setup → Integrations → Manage Integrations → New).

3. Generate Consumer Key / Consumer Secret.

4. Assign a User + Role and generate Token ID / Token Secret.

5. On your server, call the RESTlet using those credentials.


## Finding Fields in NetSuite
### Entity Status
1. Create a new Entity Status type by navigating to 
`Setup > Sales > Customer Statuses`

2. Create new lead named 
`Lead - Topper Quote`
- Type
Lead

- Label
Topper Quote

- Probablity
66.0%

### Custom Estimate Form
1. Navigate to 
`Customization → Forms → Transaction Forms`

2. Find Custom Form and grab internal ID
My internal id = 229