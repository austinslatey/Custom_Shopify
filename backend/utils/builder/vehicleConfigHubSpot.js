import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

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
  const HUBSPOT_CONTACTS_URL = 'https://api.hubapi.com/crm/v3/objects/contacts';
  const HUBSPOT_FILES_URL = 'https://api.hubapi.com/files/v3/files';
  const HUBSPOT_NOTES_URL = 'https://api.hubapi.com/crm/v3/objects/notes';
  const HUBSPOT_SUBSCRIPTION_URL = 'https://api.hubapi.com/communication-preferences/v3/subscribe';

  let results = { success: true, errors: [], contactId: null };
  let contactId = null;
  let profileResponse = null;

  // === 1. FORM SUBMISSION ===
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
    console.log('Form submission response:', formResponse.status);
  } catch (error) {
    console.error('Form submission error:', error.message);
    results.errors.push(`Form submission error: ${error.message}`);
  }

  // === 2. MARKETING SUBSCRIPTION ===
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
      console.log('Marketing subscription response:', subscriptionResponse.status);
    } catch (error) {
      console.error('Marketing subscription error:', error.message);
      results.errors.push(`Marketing subscription error: ${error.message}`);
    }
  }

  // === 3. CONTACT SEARCH / CREATE / UPDATE ===
  try {
    const profileData = {
      filterGroups: [{
        filters: [{ propertyName: 'email', operator: 'EQ', value: email }]
      }],
      properties: ['email', 'firstname', 'lastname', 'phone', 'address', 'city', 'state', 'zip', 'country', 'hubspot_owner_id'],
    };

    profileResponse = await axios.post(`${HUBSPOT_CONTACTS_URL}/search`, profileData, {
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('Contact search response:', profileResponse.status);

    if (!profileResponse.data.results?.length) {
      // Create new
      const createResponse = await axios.post(HUBSPOT_CONTACTS_URL, {
        properties: {
          firstname: first_name,
          lastname: last_name,
          email,
          phone,
          address,
          city,
          state,
          zip,
          country,
          hs_lead_status: 'NEW',
          lead_type: 'Conversion vehicle',
          lead_from: 'Website - Vehicle Builder',
        },
      }, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      contactId = createResponse.data.id;
      console.log('Contact created:', contactId);
    } else {
      contactId = profileResponse.data.results[0].id;
      await axios.patch(`${HUBSPOT_CONTACTS_URL}/${contactId}`, {
        properties: {
          firstname: first_name,
          lastname: last_name,
          phone,
          address,
          city,
          state,
          zip,
          country,
        },
      }, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      console.log('Contact updated:', contactId);
    }
    results.contactId = contactId;
  } catch (error) {
    console.error('Contact search/create error:', error.message);
    results.errors.push(`Contact error: ${error.message}`);
  }

  // === 4. OWNER ID ASSIGNMENT ===
  if (contactId) {
    const isNewContact = !profileResponse?.data?.results?.length;
    const currentOwnerId = profileResponse?.data?.results?.[0]?.properties?.hubspot_owner_id;

    if (isNewContact || !currentOwnerId) {
      try {
        await axios.patch(`${HUBSPOT_CONTACTS_URL}/${contactId}`, {
          properties: { hubspot_owner_id: '18814870' },
        }, {
          headers: {
            Authorization: `Bearer ${HUBSPOT_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        });
        console.log('Owner ID assigned');
      } catch (error) {
        console.error('Owner ID update error:', error.message);
        results.errors.push(`Owner ID error: ${error.message}`);
      }
    }
  }

  // === 5. FILE UPLOAD (ONLY IF contactId exists) ===
  let fileId = null;
  if (file_path && file_name && contactId) {
    try {
      const fileContent = await fs.readFile(file_path);

      const formData = new FormData();

      formData.append('file', fileContent, {
        filename: file_name,
        contentType: 'application/pdf',
        knownLength: fileContent.length
      });

      formData.append('options', JSON.stringify({
        access: 'PRIVATE',
        overwrite: false,
        category: 'HUBSPOT_DEFAULT'
      }));

      formData.append('folderId', '196279583602');

      const fileResponse = await axios.post(HUBSPOT_FILES_URL, formData, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          ...formData.getHeaders(),
        },
        timeout: 60000,
      });

      fileId = fileResponse.data.id;
      console.log('File uploaded to HubSpot:', fileId);

      // === DELETE TEMP FILE AFTER SUCCESSFUL UPLOAD ===
      try {
        await fs.unlink(file_path);
        console.log('Temporary PDF deleted:', file_path);
      } catch (unlinkError) {
        console.warn('Failed to delete temporary PDF (non-critical):', unlinkError.message);
      }

    } catch (error) {
      console.error('File upload failed:', error.response?.data || error.message);
      results.errors.push(`File upload failed: ${error.response?.data?.message || error.message}`);

      // Optional: Still try to clean up on failure (safe to attempt)
      try {
        await fs.unlink(file_path);
        console.log('Temporary PDF deleted after failed upload:', file_path);
      } catch (unlinkError) {
        console.warn('Could not delete temp file after failed upload:', unlinkError.message);
      }
    }
  }

  // === 6. NOTE WITH ATTACHMENT ===
  if (fileId && contactId) {
    try {
      const engagementData = {
        properties: {
          hs_timestamp: new Date().toISOString(),
          hubspot_owner_id: '18814870',
          hs_note_body: `Vehicle Configuration PDF for ${first_name} ${last_name}`,
          hs_attachment_ids: fileId,
        },
        associations: [{
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }]
        }],
      };

      await axios.post(HUBSPOT_NOTES_URL, engagementData, {
        headers: {
          Authorization: `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      console.log('Note created with PDF');
    } catch (error) {
      console.error('Note creation failed:', error.message);
      results.errors.push(`Note error: ${error.message}`);
    }
  }

  results.success = results.errors.length === 0 || contactId !== null;
  return results;
};