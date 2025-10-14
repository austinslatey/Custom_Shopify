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