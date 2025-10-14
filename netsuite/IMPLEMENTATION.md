# Implementation Info
Requirements needed to scave a path to meet acceptance criteria

## Acceptance Criteria
When a user submits a quote request on Shopify

I want the data collected inside of NetSuite

## Clarification Points
1. Where do you want the quote data to go in NetSuite?

    Do you want each quote request to create a lead/prospect record, a custom record, or a sales transaction (Estimate/Quote) in NetSuite?

    - Estimate/Quote is technically possible, I'm just not sure if an existing customer needs to exist before the Estimate/Quote data is submitted.

    - I'm not sure simply setting the customer to lead/prospect in NetSuite will be enough

    - A custom record may be suitable for strict data handling of this data instead of dumping it somewhere else.. Estimate/Quote or Custom Record probably would be the best options, I'm only worried about the traffic of quote submissions overcrowding the existing Estimate/Quotes workflow

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
`Unsure, there really isn't a direct workflow inside of NetSuite where this data already is being processed by sales staff.`

    - Through REST/SOAP web services (direct integration),

    I would like to connect it to my existing server, I just don't want the user have to sign in to submit the quote request to land inside of netsuite. If there is a better option to achieve this, I don't mind ignoring my exisiting server.

    - via middleware (Celigo, Dell Boomi, Workato, etc.),

    I use NetSuite Connector (Far App) for product/order/etc but nothing for inquiries only 

    - or a custom webhook endpoint (RESTlet) hosted in NetSuite?

    I would like to connect it to my existing server, I just don't want the user have to sign in to submit the quote request to land inside of netsuite. If there is a better option to achieve this, I don't mind ignoring my exisiting server.

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
- Custom Record (Quote Request)
- (Optionally) Prospect/Customer
- (Optionally) Estimate/Quote Transaction
```

## STEP 1: Decide What to Create in NetSuite
### Option A — Custom Record: “Shopify Quote Request”

- Safest approach for volume and workflow separation.

- Data can later be reviewed, converted into a lead/prospect or Estimate manually or via workflow.

- No need for a valid NetSuite customer record.

#### Benefits:

- Keeps sales transaction lists clean.

- Allows you to add workflow approvals or email alerts in NetSuite.

- Easy to expand with new fields (e.g., SKU, VIN, vehicle details).

### Option B — Estimate Record

- Only use if you want quotes directly accessible to your sales staff in Transactions > Sales > Estimates.

- You’ll need to link to a Customer/Prospect.

- If the customer doesn’t exist, the RESTlet must first create one (using record.create({ type: record.Type.CUSTOMER })).

#### Note: 

NetSuite allows Estimate creation under a Prospect or Lead, but it still needs a valid customer record.

## STEP 2: Build a SuiteScript 2.1 RESTlet

Example File Name: `/SuiteScripts/ShopifyQuoteRESTlet.js`

Implementation example is located in `RESTlet.js`

## STEP 3: Create the Custom Record Type in NetSuite

#### Go to:

`Customization → Lists, Records, & Fields → Record Types → New`

#### Name:  `Shopify Quote Request`

#### ID:  `customrecord_shopify_quote_request`

Add custom fields for each form value (e.g., `custrecord_first_name`, `custrecord_vehicle_make`, etc.)

#### Enable:

- “Allow UI Access”

- “Available for SuiteScript”

- “Include in Search”

#### Optional:
Add a workflow or saved search email alert to notify Sales when a new record is created.


## Step 4: Deploy the RESTlet

#### Go to: `Customization → Scripting → Scripts → New`

1. Upload your file.

2. Create Script Record → RESTlet.

3. Add a Script Deployment and set Status: Released.

4 Note down the External URL looks like:
`https://<account>.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=XXX&deploy=1`

## Step 5: Authentication (No User Login Required)

Use Token-Based Authentication (TBA) between your server and NetSuite.

#### Steps:

1. Enable TBA (Setup → Company → Enable Features → SuiteCloud tab).

2. Create an Integration Record (Setup → Integrations → Manage Integrations → New).

3. Generate Consumer Key / Consumer Secret.

4. Assign a User + Role and generate Token ID / Token Secret.

5. On your server, call the RESTlet using those credentials.