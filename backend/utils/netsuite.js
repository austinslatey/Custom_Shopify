import axios from 'axios';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

const countryMap = {
    'United States': 'US',
    'Canada': 'CA',
    'Other': ''
};

const stateMap = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
    'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
    'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
    'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
    'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
    'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA',
    'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
    'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY',
    'Alberta': 'AB', 'British Columbia': 'BC', 'Manitoba': 'MB', 'New Brunswick': 'NB',
    'Newfoundland and Labrador': 'NL', 'Nova Scotia': 'NS', 'Ontario': 'ON',
    'Prince Edward Island': 'PE', 'Quebec': 'QC', 'Saskatchewan': 'SK',
    'Northwest Territories': 'NT', 'Nunavut': 'NU', 'Yukon': 'YT'
};

const nsCountry = (country) => countryMap[country] || country;
const nsState = (state) => stateMap[state] || state;


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


export { netsuiteRequest, countryMap, stateMap, nsCountry, nsState };