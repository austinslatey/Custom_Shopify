import axios from 'axios';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

const netsuiteRequest = async (data) => {
    let url; 
     if (data.isTopperQuote) {
        url = process.env.NETSUITE_TOPPER_QUOTE_RESTLET_URL;
     } else if (data.isBuilder) {
        url = process.env.NETSUITE_BUILDER_RESTLET_URL;
     } else {
        url = process.env.NETSUITE_QUOTE_RESTLET_URL;
     }
    
    const oauth = OAuth({
        consumer: {
            key: process.env.NETSUITE_CONSUMER_KEY,
            secret: process.env.NETSUITE_CONSUMER_SECRET,
        },
        signature_method: "HMAC-SHA256",
        hash_function(baseString, key) {
            return crypto.createHmac("sha256", key).update(baseString).digest("base64");
        },
    });

    const token = {
        key: process.env.NETSUITE_TOKEN_ID,
        secret: process.env.NETSUITE_TOKEN_SECRET,
    };

    const requestData = { url, method: "POST" };
    const oauthHeaderObj = oauth.toHeader(oauth.authorize(requestData, token));

    const authHeader = `${oauthHeaderObj.Authorization}, realm="${process.env.NETSUITE_ACCOUNT_ID}"`;

    const headers = {
        Authorization: authHeader,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.post(url, data, { headers, timeout: 30000 });
        return response.data;
    } catch (err) {
        console.error("NetSuite RESTlet Error:", err.response?.data || err.message);
        throw new Error(`NetSuite RESTlet Error: ${JSON.stringify(err.response?.data?.error || err.message)}`);
    }
};

export { netsuiteRequest };