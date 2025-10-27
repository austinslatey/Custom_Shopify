import sgMail from '@sendgrid/mail';
import fs from 'fs/promises';

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
    from: process.env.EMAIL_FROM,
    cc: process.env.SALES_EMAIL,
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
    return { success: true };
  } catch (error) {
    console.error('[Vehicle Config Email] Email sending error:', error.message, error.response?.body);
    return { success: false, error: `Email sending error: ${error.message}` };
  }
};