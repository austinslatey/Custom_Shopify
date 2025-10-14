# Implementation Info
Requirements needed to scave a path to meet acceptance criteria

## Acceptance Criteria
When a user submits a quote request on Shopify
I want the data collected inside of NetSuite

## Clarification Points
1. Where do you want the quote data to go in NetSuite?

    Do you want each quote request to create a lead/prospect record, a custom record, or a sales transaction (Estimate/Quote) in NetSuite?

2. What information does your Shopify “Request a Quote” button collect?

    - For example: customer name, email, product(s) requested, quantity, notes, etc.

    - Is this data stored in Shopify (e.g., as a draft order, metafield, or in a form app like Hulk, Globo, or a custom HTML form)?

3. How do you want the data sent to NetSuite?

    - Through REST/SOAP web services (direct integration),

    - via middleware (Celigo, Dell Boomi, Workato, etc.),

    - or a custom webhook endpoint (RESTlet) hosted in NetSuite?

4. What version of NetSuite are you using / do you have SuiteScript and SuiteTalk features enabled?

    - Specifically, SuiteCloud → “SuiteScript” and “SOAP/REST Web Services”.