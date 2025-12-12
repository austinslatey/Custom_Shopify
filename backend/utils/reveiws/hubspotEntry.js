// utils/reveiws/hubspotEntry.js — FINAL WORKING VERSION (matches your proven pattern)
import axios from 'axios';

export const submitToHubSpot = async (fields) => {
    const HUBSPOT_FORM_URL = process.env.HUBSPOT_REVIEWS_FORM_URL ||
        'https://api.hsforms.com/submissions/v3/integration/submit/2692861/06f00b7b-c0c5-47ee-a437-2457ac762716';

    // Convert fields to URLSearchParams exactly like your working example
    const formData = new URLSearchParams();

    Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, String(value || ''));
    });

    // Add context (safe values — no window)
    formData.append('pageUri', 'https://www.waldoch.com/reviews/');
    formData.append('pageName', 'Waldoch Review Form');

    try {
        const response = await axios.post(HUBSPOT_FORM_URL, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000
        });

        console.log('HubSpot Review Form submitted:', response.status);
        return response.data;
    } catch (error) {
        console.error('HubSpot submission failed:', error.response?.data || error.message);
        throw new Error(`HubSpot failed: ${error.response?.status || 'Network error'}`);
    }
};