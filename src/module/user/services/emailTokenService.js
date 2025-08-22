const nodemailer = require("nodemailer");
const config = require("../../../config/config");

class EmailServiceForToken {
  constructor() {
    this.transporter = this.createTransport();
  }

  createTransport() {
    return nodemailer.createTransport({
      host: config.smtp.host,
      port: Number.parseInt(config.smtp.port || "587"),
      secure: config.smtp.secure === "true" || config.smtp.secure === true, // ensure boolean
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }

  async sendTokenEmail(email, token, firstName) {
    try {
      const verificationUrl = `${config.url.dev_link}/v2/verifyEmail/${token}`;

      const mailOptions = {
        from: `"${config.appName || "Auth App"}" <${config.smtp.user}>`,
        to: email,
        subject: "Verify Your Email Address",
        text: `Hello ${firstName},\n\nPlease verify your email using this link: ${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`,
        html: `
          <div style="background-color:#f4f4f4; padding:20px; font-family: Arial, sans-serif;">
            <table align="center" width="100%" cellpadding="0" cellspacing="0" 
                   style="max-width:600px; background-color:#ffffff; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding:40px 20px; text-align:center;">
                  <h1 style="color:#2c3e50; margin-bottom:10px; font-size:24px;">Welcome to ${
                    config.appName || "Our App"
                  }!</h1>
                  <h2 style="color:#34495e; margin-bottom:20px; font-size:18px; font-weight:normal;">Please verify your email address</h2>
                  <p style="color:#555; font-size:16px; margin-bottom:30px; line-height:1.5;">
                    Hi <strong>${firstName}</strong>,<br><br>
                    Thank you for creating an account! To complete your registration and start using our services, 
                    please verify your email address by clicking the button below.
                  </p>
                  <a href="${verificationUrl}" 
                     style="background-color:#3498db; color:#fff; padding:15px 30px; 
                            text-decoration:none; border-radius:5px; font-size:16px; font-weight:bold;
                            display:inline-block; margin:20px 0;">
                    Verify My Email
                  </a>
                  <p style="color:#777; font-size:14px; margin-top:30px; line-height:1.4;">
                    <strong>Important:</strong> This verification link will expire in <strong>24 hours</strong>.<br>
                    If you did not create an account with us, please ignore this email.
                  </p>
                  <hr style="border:none; border-top:1px solid #eee; margin:30px 0;">
                  <p style="color:#999; font-size:12px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${verificationUrl}" style="color:#3498db; word-break:break-all;">${verificationUrl}</a>
                  </p>
                </td>
              </tr>
            </table>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Verification email sent:", info.messageId);
      return true;
    } catch (error) {
      console.error("Email sending failed:", error.message);
      return false;
    }
  }
}

module.exports = { EmailServiceForToken };
