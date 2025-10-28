# Returns API
## Initial Thought Process
I will probably need some required inputs (Two columns)
- First Name (Left column)
- Last Name (Right Column)
- Order Number (single column)
*Part section should be wrapped in a border of some kind for readability*
- Part they want to return (Left Column)
- Product is any of the following (Dropdown, Right Column):
    - Ordered wrong item
    - Duplicate order of product
    - Wrong part
    - Damaged in shipping
    - Did not fit
    - Changed my mind

**(Add a button here if they have multiple items they would like to return if it's the same order number)**
- Store Credit or Refund selection
- Message (Any details they would like to share with us)

## Revised Thought Process
I'm thinking of doing it a little differently using the Shopify Admin API to search for orders and potentially using this existing method as a fallback option so the user doesnt have to input as much data. 

### First step: 
Customer information (required for Order Number Lookup) 
- First Name (Left column)
- Last Name (Right Column)
- Email (Single Column)

Send this data to server to process data securely

### Second step:
Perform lookup of customer order, find and filter by current date minus 30 days

### Third step: 
Render data - 
Pull up order number and list order number
list all parts/products within the given order with a checkbox for each part so they can optionally select the products they want to return
 
If a part is selected/checked, render a dropdown of reason returning 
    - Ordered wrong item
    - Duplicate order of product
    - Wrong part
    - Damaged in shipping
    - Did not fit
    - Changed my mind

- Store Credit or Refund selection
- Message (Any details they would like to share with us)
