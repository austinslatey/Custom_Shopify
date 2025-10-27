import sgMail from '@sendgrid/mail';

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

