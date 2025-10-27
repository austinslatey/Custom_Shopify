import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';


// Submits quote request data to HubSpot
export const submitToHubSpot = async ({ first_name, last_name, email, phone, product_title, sku, quantity, vehicle_make, vehicle_model, vehicle_year, vin_number, address, state, country, message, isTopper, req }) => {
    // If topper use topper url else use general quote form
    const hubspotUrl = isTopper ? process.env.HUBSPOT_TOPPER_QUOTE_URL : process.env.HUBSPOT_QUOTE_URL;

    // Validate environment variables
    if (!hubspotUrl) {
        const error = `HubSpot URL is missing for ${isTopper ? 'topper' : 'general'} quote`;
        console.error(error);
        return { success: false, error };
    }

    // State code to full name mapping (US states and Canadian provinces)
    const stateFullNameMap = {
        // US States
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
        'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
        'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
        'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
        'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
        // Canadian Provinces
        'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
        'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'ON': 'Ontario', 'PE': 'Prince Edward Island',
        'QC': 'Quebec', 'SK': 'Saskatchewan'
    };

    // Country code to full name mapping (if needed; test if codes work)
    const countryFullNameMap = {
        'US': 'United States',
        'CA': 'Canada'
    };

    // Sanitize inputs to prevent injection or invalid characters
    const sanitizedData = {
        first_name: String(first_name || '').trim(),
        last_name: String(last_name || '').trim(),
        email: String(email || '').trim(),
        phone: String(phone || '').trim(),
        product_title: String(product_title || '').trim(),
        sku: String(sku || '').trim(),
        quantity: isTopper ? '' : String(quantity || '').trim(),
        vehicle_make: String(vehicle_make || '').trim(),
        vehicle_model: String(vehicle_model || '').trim(),
        vehicle_year: String(vehicle_year || '').trim(),
        vin_number: String(vin_number || '').trim(),
        address: String(address || '').trim(),
        state: String(state || '').trim(),
        country: String(country || '').trim(),
        message: String(message || '').trim(),
    };

    // Map state and country to full names for HubSpot
    const hubspotState = stateFullNameMap[sanitizedData.state] || sanitizedData.state;
    const hubspotCountry = countryFullNameMap[sanitizedData.country] || sanitizedData.country; // Fallback to code if full name not needed

    const hubspotData = {
        fields: [
            { name: 'firstname', value: sanitizedData.first_name },
            { name: 'lastname', value: sanitizedData.last_name },
            { name: 'email', value: sanitizedData.email },
            { name: 'phone', value: sanitizedData.phone },
            { name: 'product_name', value: sanitizedData.sku },
            { name: 'address', value: sanitizedData.address },
            { name: 'state', value: hubspotState },  // Use full name
            { name: 'country', value: hubspotCountry },  // Use full name or code (test both)
            ...(!isTopper ? [{ name: 'product_quantity', value: sanitizedData.quantity }] : []),
            ...(isTopper ? [
                { name: 'vehicle_make', value: sanitizedData.vehicle_make },
                { name: 'vehicle_type', value: sanitizedData.vehicle_model },
                { name: 'vehicle_year', value: sanitizedData.vehicle_year },
                { name: 'vehicle_vin', value: sanitizedData.vin_number },
            ] : []),
            ...(sanitizedData.message ? [{ name: 'message', value: sanitizedData.message }] : []),
        ],
        context: {
            pageUri: req.headers.referer || process.env.REF_URL,
            pageName: product_title,
        },
    };

    try {
        await axios.post(hubspotUrl, hubspotData);
        return { success: true };
    } catch (hubspotError) {
        const errorMessage = `HubSpot submission error for ${isTopper ? 'topper' : 'general'} quote: ${hubspotError.response?.data || hubspotError.message}`;
        console.error(errorMessage);
        return { success: false, error: errorMessage };
    }
};

export const submitToVehicleConfigHubspot = async ({
  first_name,
  last_name,
  email,
  phone,
  address,
  city,
  state,
  zip,
  country,
  contact_preference,
  purchase_timeline,
  dealer,
  comments,
  special_offers,
  vehicle_make,
  vehicle_type,
  vehicle_package,
  file_path,
  file_name,
  req,
}) => {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  const HUBSPOT_FORM_URL = process.env.HUBSPOT_BUILDER_FORM_URL;
  const HUBSPOT_CONTACTS_URL = 'https://api.hubapi.com/crm/v3/objects/CONTACTS';
  const HUBSPOT_FILES_URL = 'https://api.hubapi.com/files/v3/files';
  const HUBSPOT_NOTES_URL = 'https://api.hubapi.com/crm/v3/objects/notes';
  const HUBSPOT_SUBSCRIPTION_URL = 'https://api.hubapi.com/communication-preferences/v3/subscribe';

  let results = { success: true, errors: [] };

  // Form submission
  const formData = {
    firstname: first_name,
    lastname: last_name,
    email,
    phone,
    country,
    state,
    city,
    address,
    zip,
    leadin_any_comments_to_the_order_92b0d65e7d26e0732539c9248e5bda6d: comments,
    contact_preference,
    purchase_timeline,
    preferred_dealer: dealer,
    hs_lead_status: 'NEW',
    lead_type: 'Conversion vehicle',
    lead_from: 'Website - Vehicle Builder',
    vehicle_make,
    vehicle_type,
    vehicle_package,
    hs_context: JSON.stringify({
      hutk: req.cookies?.hubspotutk || '',
      ipAddress: req.ip,
      pageUrl: req.headers.referer || `${req.protocol}://${req.get('host')}/api/builder`,
      pageName: 'Vehicle Config API',
    }),
  };

  try {
    const formResponse = await axios.post(HUBSPOT_FORM_URL, new URLSearchParams(formData), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });
    console.log('[Vehicle Config HubSpot] Form submission response:', formResponse.status, formResponse.data);
    if (formResponse.status >= 400) {
      throw new Error('Failed to create/update HubSpot contact via form');
    }
  } catch (error) {
    console.error('[Vehicle Config HubSpot] Form submission error:', error.message);
    results.errors.push(`Form submission error: ${error.message}`);
    results.success = false;
    return results;
  }

  // Marketing subscription if special_offers is 'Yes'
  if (special_offers === 'Yes') {
    try {
      const subscriptionData = {
        emailAddress: email,
        legalBasis: 'CONSENT_WITH_NOTICE',
        subscriptionId: '7669156',
        legalBasisExplanation: 'Customer checked special offer box',
      };
      const subscriptionResponse = await axios.post(HUBSPOT_SUBSCRIPTION_URL, subscriptionData, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      console.log('[Vehicle Config HubSpot] Marketing subscription response:', subscriptionResponse.status, subscriptionResponse.data);
      if (subscriptionResponse.status >= 400) {
        console.error('[Vehicle Config HubSpot] Marketing subscription failed:', subscriptionResponse.status, subscriptionResponse.data);
        results.errors.push('Marketing subscription failed');
      }
    } catch (error) {
      console.error('[Vehicle Config HubSpot] Marketing subscription error:', error.message);
      results.errors.push(`Marketing subscription error: ${error.message}`);
    }
  }

  // Retrieve HubSpot contact ID
  let contactId;
  try {
    const profileData = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      properties: ['email'],
    };
    const profileResponse = await axios.post(`${HUBSPOT_CONTACTS_URL}/search`, profileData, {
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    console.log('[Vehicle Config HubSpot] Contact search response:', profileResponse.status, profileResponse.data);
    if (!profileResponse.data.results || profileResponse.data.results.length === 0) {
      throw new Error('No HubSpot contact found for email');
    }
    contactId = profileResponse.data.results[0].id;
    if (!contactId) {
      throw new Error('Failed to retrieve HubSpot contact ID');
    }
  } catch (error) {
    console.error('[Vehicle Config HubSpot] Contact search error:', error.message);
    results.errors.push(`Contact search error: ${error.message}`);
    results.success = false;
    return results;
  }

  // Update contact with owner ID
  try {
    const updateData = {
      properties: {
        hubspot_owner_id: '18814870',
      },
    };
    const updateResponse = await axios.patch(`${HUBSPOT_CONTACTS_URL}/${contactId}`, updateData, {
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    console.log('[Vehicle Config HubSpot] Contact update response:', updateResponse.status, updateResponse.data);
  } catch (error) {
    console.error('[Vehicle Config HubSpot] Contact update error:', error.message);
    results.errors.push(`Contact update error: ${error.message}`);
  }

  // Upload PDF to HubSpot
  if (file_path && file_name) {
    try {
      const boundary = uuidv4();
      const fileContent = await fs.readFile(file_path);
      const formData = [
        `--${boundary}\r\nContent-Disposition: form-data; name="options"\r\n\r\n${JSON.stringify({
          access: 'PRIVATE',
          overwrite: false,
          category: 'HUBSPOT_DEFAULT',
        })}\r\n`,
        `--${boundary}\r\nContent-Disposition: form-data; name="folderId"\r\n\r\n196279583602\r\n`,
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file_name}"\r\nContent-Type: application/pdf\r\n\r\n`,
        fileContent,
        `\r\n--${boundary}--\r\n`,
      ];

      const fileResponse = await axios.post(HUBSPOT_FILES_URL, Buffer.concat(formData.map((part) => (Buffer.isBuffer(part) ? part : Buffer.from(part)))), {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        timeout: 30000,
      });
      console.log('[Vehicle Config HubSpot] File upload response:', fileResponse.status, fileResponse.data);
      const fileId = fileResponse.data.id;
      if (!fileId || fileResponse.status >= 400) {
        throw new Error('Failed to upload PDF to HubSpot or retrieve file ID');
      }

      // Create HubSpot Note
      try {
        const engagementData = {
          properties: {
            hs_timestamp: new Date().toISOString(),
            hubspot_owner_id: '18814870',
            hs_note_body: `Vehicle Configuration PDF for ${first_name} ${last_name}`,
            hs_attachment_ids: fileId,
          },
          associations: [
            {
              to: { id: contactId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }],
            },
          ],
        };
        const engagementResponse = await axios.post(HUBSPOT_NOTES_URL, engagementData, {
          headers: {
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        });
        console.log('[Vehicle Config HubSpot] Notes creation response:', engagementResponse.status, engagementResponse.data);
        if (engagementResponse.status >= 400) {
          console.error('[Vehicle Config HubSpot] Notes creation failed:', engagementResponse.status, engagementResponse.data);
          results.errors.push('Notes creation failed');
        }
      } catch (error) {
        console.error('[Vehicle Config HubSpot] Notes creation error:', error.message);
        results.errors.push(`Notes creation error: ${error.message}`);
      }
    } catch (error) {
      console.error('[Vehicle Config HubSpot] File upload error:', error.message);
      results.errors.push(`File upload error: ${error.message}`);
      results.success = false;
      return results;
    }
  }

  return results;
};