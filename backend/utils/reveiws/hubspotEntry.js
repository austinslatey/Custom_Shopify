// utils/reveiws/hubspotEntry.js
import axios from 'axios';

export const submitToHubSpot = async (fields) => {
  const url = 'https://api.hsforms.com/submissions/v3/integration/submit/2692861/06f00b7b-c0c5-47ee-a437-2457ac762716';

  const data = {
    fields: Object.entries(fields).map(([name, value]) => ({
      name,
      value: String(value || '')
    })),
    context: {
      pageUri: 'https://www.waldoch.com/reviews/',
      pageName: 'Waldoch Review Form'
    },
    // THIS IS THE MISSING PIECE — HubSpot now requires this even for optional consent
    legalConsentOptions: {
      consent: {
        consentToProcess: true,
        text: 'By submitting this form, I agree to the processing of my data.',
        communications: fields.consent_marketing ? [{
          value: true,
          subscriptionTypeId: 999,
          text: 'I agree to receive marketing communications from Waldoch.'
        }] : []
      }
    }
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json'  // ← THIS IS THE SECRET
      }
    });

    console.log('HubSpot success:', response.status);
    return response.data;
  } catch (error) {
    console.error('HubSpot failed:', error.response?.status, error.response?.data || error.message);
    throw error;
  }
};