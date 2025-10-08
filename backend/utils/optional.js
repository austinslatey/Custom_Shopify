// Optional: Fetch product details from Shopify GraphQL
import fetch from "node-fetch";

// Shopify GraphQL API URL
const SHOPIFY_API_URL = `${process.env.ADMIN_URL}`;

let productDetails = {};
try {
    const query = `
        query {
          product(id: "gid://shopify/Product/${product_id}") {
            vendor
            variants(first: 1) {
              edges {
                node {
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      `;
    const response = await fetch(SHOPIFY_API_URL, {
        method: "POST",
        headers: {
            "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });
    if (response.ok) {
        const data = await response.json();
        if (data.errors) {
            console.error("GraphQL errors:", data.errors);
        } else {
            const product = data.data.product;
            productDetails = {
                vendor: product?.vendor || "N/A",
                price: product?.variants.edges[0]?.node.price.amount || "N/A",
            };
        }
    } else {
        console.error("Shopify API error:", response.status, response.statusText);
    }
} catch (shopifyErr) {
    console.error("Shopify GraphQL fetch error:", shopifyErr);
    // Continue without product details
}