// utils/returns/email.js
import sgMail from '@sendgrid/mail';

/**
 * Sends two emails:
 * 1. Internal (to sales/returns team)
 * 2. Customer confirmation
 *
 * @param {Object} data
 * @param {string} data.order_name          e.g. #1001
 * @param {Object} data.customer            Shopify customer object
 * @param {string} data.refund_method       "store_credit" | "original_payment"
 * @param {string} [data.message]           Optional customer note
 * @param {Array}  data.items               [{ title, sku, reason }]
 */
export const sendReturnEmails = async ({
  order_name,
  customer,
  refund_method,
  message = '',
  items = [],
}) => {
  const { first_name, last_name, email } = customer;

  // === INTERNAL EMAIL (to your team) ===
  const internalItemsHtml = items
    .map(
      (it) => `
        <li>
          <strong>${it.title}</strong>
          ${it.sku ? `<br><small>SKU: ${it.sku}</small>` : ''}
          <br><em>Reason: ${formatReason(it.reason)}</em>
        </li>`
    )
    .join('');

  const internalEmailData = {
    to: process.env.RETURNS_EMAIL || process.env.SALES_EMAIL,
    from: process.env.EMAIL_FROM,
    subject: `Return Request – ${order_name}`,
    html: `
      <h2>New Return Request</h2>
      <p><strong>Order:</strong> ${order_name}</p>
      <p><strong>Customer:</strong> ${first_name} ${last_name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Refund Preference:</strong> ${formatRefundMethod(refund_method)}</p>

      <h3>Items to Return:</h3>
      <ul>${internalItemsHtml}</ul>

      ${message ? `<p><strong>Customer Message:</strong><br>${escapeHtml(message)}</p>` : ''}

      <hr>
      <p>Thank you,</p>
      <p>The Waldoch Returns Team</p>
      <p style="margin-top:20px; text-align:center;">
        <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png"
             alt="Waldoch Logo" style="max-width:200px; height:auto;">
      </p>
    `,
  };

  // === CUSTOMER CONFIRMATION EMAIL ===
  const customerItemsHtml = items
    .map(
      (it) => `
        <li>
          <strong>${it.title}</strong>
          ${it.sku ? ` (SKU: ${it.sku})` : ''}
          <br><em>Reason: ${formatReason(it.reason)}</em>
        </li>`
    )
    .join('');

  const customerEmailData = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: `Return Request Received – ${order_name}`,
    html: `
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        h2 { color: #dc3545; }
        p { margin: 5px 0; }
        .logo { max-width: 200px; height: auto; }
      </style>

      <h2>Return Request Received</h2>
      <p>Dear ${first_name} ${last_name},</p>

      <p>Thank you for submitting a return request for <strong>Order ${order_name}</strong>.</p>

      <p><strong>Refund Method:</strong> ${formatRefundMethod(refund_method)}</p>

      <h3>Items Being Returned:</h3>
      <ul>${customerItemsHtml}</ul>

      ${message ? `<p><strong>Your Message:</strong><br>${escapeHtml(message)}</p>` : ''}

      <p>Our team will review your request and contact you within 1-2 business days with next steps (return label, inspection, etc.).</p>

      <p>Thank you for choosing Waldoch!</p>

      <p style="margin-top:20px; text-align:center;">
        <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" alt="Waldoch Logo" class="logo">
      </p>
    `,
  };

  // Send both emails in parallel
  await Promise.all([
    sgMail.send(internalEmailData),
    sgMail.send(customerEmailData),
  ]);
};

// ——————————————————————————————————————
// Helper: Human-readable reason
// ——————————————————————————————————————
function formatReason(reason) {
  const map = {
    ordered_wrong: 'Ordered wrong item',
    duplicate: 'Duplicate order of product',
    wrong_part: 'Wrong part',
    damaged: 'Damaged in shipping',
    no_fit: 'Did not fit',
    changed_mind: 'Changed my mind',
  };
  return map[reason] || reason;
}

// ——————————————————————————————————————
// Helper: Refund method display
// ——————————————————————————————————————
function formatRefundMethod(method) {
  return method === 'store_credit' ? 'Store Credit' : 'Refund to Original Payment';
}

// ——————————————————————————————————————
// Simple HTML escape
// ——————————————————————————————————————
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}