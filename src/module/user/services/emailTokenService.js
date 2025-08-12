const nodemailer = require("nodemailer")
const config = require("../../../config/config")

class EmailServiceForToken {
  constructor() {
    this.transporter = this.createTransport()
  }

  createTransport() {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: Number.parseInt(config.smtp.port || "587"),
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    })
  }

  async sendTokenEmail(email, token, firstName) {
    try {
      const mailOptions = {
        from: `"Auth" <${config.smtp.user}>`,
        to: email,
        subject: "🔑 Email Verification Token (Testing Only)",
        text: `Hello ${firstName}, your testing token is: ${token}. This will expire in 1 hour. For backend use only. Verify at: ${token}`,
        html: `
        <div style="background-color:#f4f4f4; padding:20px; font-family: Arial, sans-serif;">
          <table align="center" width="100%" cellpadding="0" cellspacing="0" 
                 style="max-width:600px; background-color:#ffffff; border-radius:10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            <tr>
              <td style="padding:20px; text-align:center;">
                <h1 style="color:#2c3e50; font-size:24px;">🔑 Email Verification Token</h1>
                <p style="color:#555; font-size:16px;">Hello <strong>${firstName}</strong>,</p>
                <p style="color:#333; font-size:18px;">Your backend testing token is:</p>
                <p style="background-color:#2c3e50; color:#ffffff; font-size:20px; font-weight:bold; padding:10px 20px; border-radius:5px; display:inline-block;">${token}</p>
                <p style="color:#777; font-size:14px;">This token will expire in <strong>1 hour</strong>. This is for backend testing purposes only.</p>
                <p>
                  <a href="${token}" 
                     style="background-color:#3498db; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px; font-size:16px; display:inline-block;">
                    Click to Verify (DEV Mode)
                  </a>
                </p>
                <p style="color:#777; font-size:12px;">If you did not request this, please ignore this email.</p>
              </td>
            </tr>
          </table>
        </div>
        `,
      }

      const info = await this.transporter.sendMail(mailOptions)
      console.log("Token email sent successfully:", info.messageId)
      return true
    } catch (error) {
      console.error("Failed to send token email:", error)
      return false
    }
  }
}

module.exports = { EmailServiceForToken }
