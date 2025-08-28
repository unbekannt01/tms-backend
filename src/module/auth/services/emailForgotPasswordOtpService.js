// services/emailForgotPasswordOtpService.js
const nodemailer = require("nodemailer")
const config = require("../../../config/config")

class EmailServiceForForgotPasswordOTP {
  constructor() {
    this.transporter = this.createTransport()
  }

  createTransport() {
    return nodemailer.createTransport({
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      host: config.smtp.host,
      port: Number.parseInt(config.smtp.port),
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
      // Timeouts (in ms)
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    })
  }

  async sendForgotPasswordOtpEmail(email, otp, firstName) {
    const mailOptions = {
      from: `"Auth" <${config.smtp.user}>`,
      to: email,
      subject: "🔑 Your OTP to Reset Password",
      priority: "high",
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
                <p style="color:#888; font-size:12px;">If you didn't request a password reset, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </div>
        `,
    }

    // First attempt
    try {
      const info = await this.transporter.sendMail(mailOptions)
      console.log("Forgot password OTP email sent:", info.messageId)
      return true
    } catch (error) {
      console.error("[OTP EMAIL] First attempt failed:", error && error.message ? error.message : error)
    }

    // Quick verify and recreate transport, then retry once
    try {
      await this.transporter.verify().catch(() => {})
      this.transporter = this.createTransport()
      const infoRetry = await this.transporter.sendMail(mailOptions)
      console.log("Forgot password OTP email sent on retry:", infoRetry.messageId)
      return true
    } catch (retryError) {
      console.error("[OTP EMAIL] Retry failed:", retryError && retryError.message ? retryError.message : retryError)
      return false
    }
  }
}

module.exports = { EmailServiceForForgotPasswordOTP }
