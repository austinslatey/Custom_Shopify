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
    console.log('Form submission response:', formResponse.status, formResponse.data);
    if (formResponse.status >= 400) {
      throw new Error('Failed to create/update HubSpot contact via form');
    }
  } catch (error) {
    console.error('Form submission error:', error.message);
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
      console.log('Marketing subscription response:', subscriptionResponse.status, subscriptionResponse.data);
      if (subscriptionResponse.status >= 400) {
        console.error('Marketing subscription failed:', subscriptionResponse.status, subscriptionResponse.data);
        results.errors.push('Marketing subscription failed');
      }
    } catch (error) {
      console.error('Marketing subscription error:', error.message);
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
    console.log('Contact search response:', profileResponse.status, profileResponse.data);
    if (!profileResponse.data.results || profileResponse.data.results.length === 0) {
      throw new Error('No HubSpot contact found for email');
    }
    contactId = profileResponse.data.results[0].id;
    if (!contactId) {
      throw new Error('Failed to retrieve HubSpot contact ID');
    }
  } catch (error) {
    console.error('Contact search error:', error.message);
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
    console.log('Contact update response:', updateResponse.status, updateResponse.data);
  } catch (error) {
    console.error('Contact update error:', error.message);
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
      console.log('File upload response:', fileResponse.status, fileResponse.data);
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
        console.log('Notes creation response:', engagementResponse.status, engagementResponse.data);
        if (engagementResponse.status >= 400) {
          console.error('Notes creation failed:', engagementResponse.status, engagementResponse.data);
          results.errors.push('Notes creation failed');
        }
      } catch (error) {
        console.error('Notes creation error:', error.message);
        results.errors.push(`Notes creation error: ${error.message}`);
      }
    } catch (error) {
      console.error('File upload error:', error.message);
      results.errors.push(`File upload error: ${error.message}`);
      results.success = false;
      return results;
    }
  }

  return results;
};