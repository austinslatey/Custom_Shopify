// utils/reviews/hubspotEntry.js
export const submitToHubSpot = async (fields) => {
    const url = process.env.HUBSPOT_REVIEWS_FORM_URL;

    const data = {
        fields: Object.entries(fields).map(([key, value]) => ({
            objectTypeId: "0-1", // contacts
            name: key,
            value: String(value || "")
        })),
        context: {
            pageUri: "https://www.waldoch.com/reviews/",
            pageName: "Reviews"
        },
        legalConsentOptions: {
            consent: {
                consentToProcess: true,
                text: "I agree to allow Waldoch to store and process my personal data.",
                communications: [
                    {
                        value: !!fields.consent_marketing,
                        subscriptionTypeId: 999,
                        text: "I agree to receive marketing communications from Waldoch."
                    }
                ]
            }
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HubSpot submission failed: ${response.status} – ${errorText}`);
    }

    return response.json();
};