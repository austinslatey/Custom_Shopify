// utils/reveiws/hubspotEntry.js — FINAL 100% WORKING VERSION
import axios from 'axios';

export const submitToHubSpot = async (fields) => {
  const url = 'https://api.hsforms.com/submissions/v3/integration/submit/2692861/06f00b7b-c0c5-47ee-a437-2457ac762716';

  // Build the exact string HubSpot wants
  let body = '';
  Object.entries(fields).forEach(([key, value]) => {
    body += `${encodeURIComponent(key)}=${encodeURIComponent(String(value || ''))}&`;
  });
  // Add context
  body += 'pageUri=' + encodeURIComponent('https://www.waldoch.com/reviews/');
  body += '&pageName=' + encodeURIComponent('Waldoch Review Form');

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    });

    console.log('HubSpot success:', response.status);
    return response.data;
  } catch (error) {
    console.error('HubSpot failed:', error.response?.status, error.response?.data || error.message);
    throw error;
  }
};