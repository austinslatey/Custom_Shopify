import sgMail from '@sendgrid/mail';
import fs from 'fs/promises';

// Sends emails for quote requests
export const sendEmails = async ({ first_name, last_name, email, phone, product_title, sku, quantity, message, vehicle_make, vehicle_model, vehicle_year, vin_number, isTopper }) => {
  const salesEmailData = {
    to: process.env.SALES_EMAIL,
    from: process.env.EMAIL_FROM,
    subject: `New Quote Request: ${product_title}`,
    html: `
      <h2>New Quote Request for: ${sku}</h2>
      <p><strong>Product:</strong> ${product_title}</p>
      <p><strong>SKU:</strong> ${sku}</p>
      ${!isTopper ? `<p><strong>Quantity:</strong> ${quantity}</p>` : ''}
      <p><strong>Customer:</strong> ${first_name} ${last_name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      ${isTopper ? `
        <p><strong>Vehicle Make:</strong> ${vehicle_make}</p>
        <p><strong>Vehicle Model:</strong> ${vehicle_model}</p>
        <p><strong>Vehicle Year:</strong> ${vehicle_year}</p>
        <p><strong>VIN:</strong> ${vin_number}</p>
      ` : ''}
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
      <hr>
      <p>Thank you,</p>
      <p>The Waldoch Team</p>
      <p style="margin-top:20px; text-align:center;">
        <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png"
             alt="Waldoch Logo" style="max-width:200px; height:auto;">
      </p>
    `,
  };

  const customerEmailData = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: `Your Quote Request for ${product_title}`,
    html: `
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        h2 { color: #007bff; }
        p { margin: 5px 0; }
        .logo { max-width: 200px; height: auto; }
      </style>
      <h2>Quote Request Received</h2>
      <p>Dear ${first_name} ${last_name},</p>
      <p>Thank you for requesting a quote for <strong>${product_title}</strong> (SKU: ${sku || 'N/A'}).</p>
      ${!isTopper ? `<p>Quantity: ${quantity}</p>` : ''}
      <p>Our team at Waldoch Truck Accessories Store has received your request and will respond soon.</p>
      <p><strong>Your Details:</strong></p>
      <p>Email: ${email}</p>
      <p>Phone: ${phone}</p>
      ${isTopper ? `
        <p>Vehicle Make: ${vehicle_make}</p>
        <p>Vehicle Model: ${vehicle_model}</p>
        <p>Vehicle Year: ${vehicle_year}</p>
        <p>VIN: ${vin_number}</p>
      ` : ''}
      ${message ? `<p>Message: ${message}</p>` : ''}
      <hr>
      <p>Best regards,</p>
      <p>The Waldoch Team</p>
      <p style="margin-top:20px; text-align:center;">
        <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" alt="Waldoch Logo" class="logo">
      </p>
    `,
  };

  await Promise.all([
    sgMail.send(salesEmailData),
    sgMail.send(customerEmailData),
  ]);
};

export const sendVehicleConfigEmail = async ({
  first_name,
  last_name,
  email,
  file_path,
  file_name,
}) => {
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });

  const emailHtml = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Vehicle Configuration Submitted</title>
    <style type="text/css">
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; color: #333333; }
        table { border-collapse: collapse; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; }
        .header { background-color: #f7f7f7; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { background-color: #f7f7f7; padding: 20px; text-align: center; font-size: 12px; color: #666666; }
        @media only screen and (max-width: 480px) { .container { width: 100% !important; } }
    </style>
</head>
<body>
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center">
                <table class="container" border="0" cellpadding="0" cellspacing="0" width="600">
                    <tr>
                        <td class="header">
                            <h1>New Vehicle Configuration Submitted</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            <p>Dear ${first_name} ${last_name},</p>
                            <p>A new vehicle configuration was submitted at ${timestamp}.</p>
                            <p>A Sales Representative will be in contact with you shortly.</p>
                            <p>Please see the attached PDF for details.</p>
                            <p>Thank you,<br>Waldoch Crafts</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" alt="Waldoch Crafts Logo" style="max-width: 150px;" />
                            <p>&copy; 2025 Waldoch Crafts. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

  let emailData = {
    to: email,
    from: process.env.EMAIL_FROM || 'noreply@waldoch.com',
    cc: process.env.SALES_EMAIL || 'wwaldoch@waldoch.com',
    subject: 'New Vehicle Configuration Submitted',
    html: emailHtml,
  };

  if (file_path && file_name) {
    const fileContent = await fs.readFile(file_path);
    const base64File = fileContent.toString('base64');
    emailData.attachments = [
      {
        content: base64File,
        filename: file_name,
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ];
  }

  try {
    await sgMail.send(emailData);
    console.log('[Vehicle Config Email] Email sent successfully');
    return { success: true };
  } catch (error) {
    console.error('[Vehicle Config Email] Email sending error:', error.message, error.response?.body);
    return { success: false, error: `Email sending error: ${error.message}` };
  }
};