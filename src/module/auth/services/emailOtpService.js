const nodemailer = require("nodemailer")
const config = require("../../../config/config")

class EmailServiceForOTP {
  constructor() {
    this.transporter = this.createTransport()
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
    })
  }

  async sendOtpEmail(email, otp, firstName) {
    try {
      const mailOptions = {
        from: `"Auth" <${config.smtp.user}>`,
        to: email,
        subject: "🔐 Your OTP for Secure Login",
        text: `Your OTP for verification is ${otp}.`,
        html: `
        <div style="background-color:#f4f4f4; padding:20px; font-family: Arial, sans-serif;">
          <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            <tr>
              <td style="padding:20px; text-align:center;">
                <h1 style="color:#2c3e50; font-size:24px;">🔒 Secure Login OTP</h1>
                <p style="color:#555; font-size:16px;">Hello <strong>${firstName}</strong>,</p>
                <p style="color:#333; font-size:18px;">Your One-Time Password (OTP) is:</p>
                <p style="background-color:#2c3e50; color:#ffffff; font-size:24px; font-weight:bold; padding:10px 20px; border-radius:5px; display:inline-block;">${otp}</p>
                <p style="color:#777; font-size:14px;">This OTP is valid for only 2 minutes. Do not share it with anyone.</p>
                <p style="color:#777; font-size:12px;">If you did not request this OTP, please ignore this email.</p>
                <p style="color:#555; font-size:14px;"><strong>Thank you</strong></p>
              </td>
            </tr>
          </table>
        </div>
        `,
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log("OTP email sent successfully:", info.messageId)
      return true
    } catch (error) {
      console.error("Failed to send OTP email:", error)
      return false
    }
  }
}

module.exports = { EmailServiceForOTP }
