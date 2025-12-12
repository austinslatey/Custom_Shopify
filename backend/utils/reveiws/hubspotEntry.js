// utils/reveiws/hubspotEntry.js — FINAL 100% WORKING
import axios from 'axios';

export const submitToHubSpot = async (fields) => {
  const url = 'https://api.hsforms.com/submissions/v3/integration/submit/2692861/06f00b7b-c0c5-47ee-a437-2457ac762716';

  // Build form data exactly like HubSpot expects
  const formData = new URLSearchParams();

  // Add all your fields
  Object.entries(fields).forEach(([key, value]) => {
    formData.append(key, String(value || ''));
  });

  // Add context (critical!)
  formData.append('pageUri', 'https://www.waldoch.com/reviews/');
  formData.append('pageName', 'Waldoch Review Form');

  try {
    const response = await axios.post(url, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    });

    console.log('HubSpot review submitted successfully:', response.status);
    return response.data;
  } catch (error) {
    console.error('HubSpot submission failed:', error.response?.status, error.response?.data || error.message);
    throw new Error(`HubSpot failed: ${error.response?.status || 'Network error'}`);
  }
};