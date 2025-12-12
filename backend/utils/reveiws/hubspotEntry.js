// utils/reveiws/hubspotEntry.js — PUBLIC ENDPOINT (works with embed forms)
export const submitToHubSpot = async (fields) => {
    const url = 'https://api.hsforms.com/submissions/v3/integration/submit/2692861/06f00b7b-c0c5-47ee-a437-2457ac762716';

    const data = {
        fields: Object.entries(fields).map(([name, value]) => ({
            name,
            value: String(value || '')
        })),
        context: {
            pageUri: window.location.href,
            pageName: 'Review Form'
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot failed: ${response.status} – ${errorText}`);
    }

    return response.json();
};