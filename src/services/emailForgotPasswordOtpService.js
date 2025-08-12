// services/emailForgotPasswordOtpService.js
const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailServiceForForgotPasswordOTP {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: parseInt(config.smtp.port),
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendForgotPasswordOtpEmail(email, otp, firstName) {
    try {
      const mailOptions = {
        from: `"Auth" <${config.smtp.user}>`,
        to: email,
        subject: '🔑 Your OTP to Reset Password',
        text: `Your OTP for resetting your password is ${otp}.`,
        html: `
        <div style="background-color:#f9f9f9; padding:20px; font-family: Arial, sans-serif;">
          <table align="center" style="max-width:600px; background-color:#ffffff; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding:20px; text-align:center;">
                <h1 style="color:#e67e22;">Password Reset Request</h1>
                <p>Hello <strong>${firstName}</strong>,</p>
                <p>You requested to reset your password. Use the OTP below to proceed:</p>
                <p style="background-color:#e67e22; color:white; font-size:24px; font-weight:bold; padding:10px 20px; border-radius:5px; display:inline-block;">${otp}</p>
                <p style="color:#888; font-size:14px;">This OTP is valid for 2 minutes.</p>
                <p style="color:#888; font-size:12px;">If you didn’t request a password reset, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Forgot password OTP email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send forgot password OTP email:', error);
      return false;
    }
  }
}

module.exports = { EmailServiceForForgotPasswordOTP };
