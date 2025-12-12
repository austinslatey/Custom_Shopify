// utils/reviews/email.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendGoogleReviewEmail = async ({ firstName, email }) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'reviews@waldoch.com',
    subject: `We'd love your review on Google, ${firstName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
        <h2 style="color: #00a651;">Thank you for your review, ${firstName}!</h2>
        <p>We’re so glad you had a great experience with Waldoch.</p>
        <p>Would you mind taking 30 seconds to share it on Google? It helps us reach more customers like you.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://g.page/r/CVER_F_AXnc-EAE/review"
             target="_blank"
             style="background:#4285f4;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Leave a Google Review
          </a>
        </div>

        <p style="color:#666; font-size:14px;">
          Thank you for helping us grow!<br>
          — The Waldoch Team
        </p>

        <hr style="margin:30px 0; border:none; border-top:1px solid #eee;">
        <p style="text-align:center;">
          <img src="https://www.waldoch.com/wp-content/uploads/2021/02/logo-wo-w-50th-314-86-1.png" 
               alt="Waldoch" style="max-width:180px;">
        </p>
      </div>
    `,
  };

  await sgMail.send(msg);
};