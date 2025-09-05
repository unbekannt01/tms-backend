// services/emailForgotPasswordOtpService.js
const nodemailer = require("nodemailer");
const config = require("../../../config/config");
const { getOtpExpiryMinutes } = require("../../../utils/otpUtils");

class EmailServiceForForgotPasswordOTP {
  constructor() {
    this.transporter = this.createTransport();
  }

  createTransport() {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: Number.parseInt(config.smtp.port || "587"),
      secure: config.smtp.secure || "true",
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  createAlternateTransport() {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: Number.parseInt(config.smtp.port),
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendForgotPasswordOtpEmail(email, otp, firstName) {
    const expiryMinutes = getOtpExpiryMinutes();

    const mailOptions = {
      from: `"TaskFlow" <${config.smtp.user}>`,
      to: email,
      subject: "🔑 Your Password Reset OTP",
      priority: "high",
      text: `Hello ${firstName}, Your OTP for resetting your password is ${otp}. This OTP is valid for ${expiryMinutes} minutes only. Do not share this OTP with anyone.`,
      html: `
        <div style="background-color:#f9f9f9; padding:20px; font-family: Arial, sans-serif;">
          <table align="center" style="max-width:600px; background-color:#ffffff; border-radius:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1);">
            <tr>
              <td style="padding:20px; text-align:center;">
                <h1 style="color:#e67e22; margin-bottom: 10px;">🔑 Password Reset Request</h1>
                <p style="color:#333; font-size:16px;">Hello <strong>${firstName}</strong>,</p>
                <p style="color:#555; font-size:14px; margin: 15px 0;">You requested to reset your password. Use the OTP below to proceed:</p>
                
                <div style="background-color:#f8f9fa; padding:20px; border-radius:8px; margin:20px 0; border-left:4px solid #e67e22;">
                  <p style="color:#e67e22; font-size:32px; font-weight:bold; margin:0; letter-spacing:3px;">${otp}</p>
                </div>
                
                <div style="background-color:#fff3cd; border:1px solid #ffeaa7; border-radius:6px; padding:15px; margin:20px 0;">
                  <p style="color:#856404; font-size:14px; margin:0;">
                    ⏰ <strong>Important:</strong> This OTP is valid for only <strong>${expiryMinutes} minutes</strong>
                  </p>
                </div>
                
                <p style="color:#666; font-size:13px; margin-top:20px;">
                  🛡️ For security reasons, do not share this OTP with anyone.<br>
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
                
                <hr style="border:none; height:1px; background-color:#eee; margin:20px 0;">
                <p style="color:#999; font-size:12px;">
                  This is an automated email from TaskFlow. Please do not reply.
                </p>
              </td>
            </tr>
          </table>
        </div>
        `,
    };

    // First attempt with primary transport
    try {
      const info = await this.transporter.sendMail(mailOptions);
      // console.log(
      //   `✅ Forgot password OTP email sent successfully: ${info.messageId}`
      // );
      return true;
    } catch (error) {
      // console.error("❌ Primary transport failed:", error?.message || error);
    }

    // Retry with transport recreation
    try {
      await this.transporter.verify().catch(() => {});
      this.transporter = this.createTransport();
      const infoRetry = await this.transporter.sendMail(mailOptions);
      // console.log(
      //   `✅ Forgot password OTP email sent on retry: ${infoRetry.messageId}`
      // );
      return true;
    } catch (retryError) {
      // console.error(
      //   "❌ Retry transport failed:",
      //   retryError?.message || retryError
      // );
    }

    // Final attempt with alternate transport
    try {
      const altTransport = this.createAlternateTransport();
      const infoAlt = await altTransport.sendMail(mailOptions);
      // console.log(
      //   `✅ Forgot password OTP email sent via alternate: ${infoAlt.messageId}`
      // );
      return true;
    } catch (altError) {
      // console.error("❌ All transports failed:", altError?.message || altError);
      return false;
    }
  }
}

module.exports = { EmailServiceForForgotPasswordOTP };
