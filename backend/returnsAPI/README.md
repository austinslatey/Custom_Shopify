# Returns API

## Acceptance Criteria
https://trucksandvanstore.returnly.com/ does not work

I need an easy form that completes what happened in this link

and send all the data into NetSuite so that 

people are able to submit their return info & employees are able to view that return data and issue a refund


## MY plan 
Custom Build: If you need something fully bespoke, create a Shopify page with a form (using Liquid/HTML), capture data via webhooks, and post to NetSuite's REST API (docs at https://system.netsuite.com/app/help/helpcenter.nl?fid=chapter_4406046579.html). This requires dev work but avoids app fees.

## Overview
- Frontend: 
A Shopify page with a simple HTML/JS form for customers to submit return details (order number, email, items, reason, optional photos).
- Backend: 
A Node.js/Express server on Render that receives form submissions, maps data to a NetSuite Return Authorization (RMA) payload, and posts to NetSuite's REST API using OAuth 1.0a.
- NetSuite: 
RMAs appear for employee review/refunding.
- Cost: 
Free on Render's free tier; one-time dev effort

## Form Criteria
1. Email (Required)
2. First Name
3. Last Name

4. Order Number

5. Select the products you want to return
- One product at a time
- Enter new product (triggered by button)

6. Reason for return should include a dropdown of the following:
- Ordered wrong item
- Duplicate order of product
- Wrong part
- Damaged in shipping
- Did not fit
- Changed my mind

7. Message
