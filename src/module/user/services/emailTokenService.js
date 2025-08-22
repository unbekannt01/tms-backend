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
      secure: config.smtp.secure === "true" || config.smtp.secure === true,
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
        from: `"${config.appName || "TMS - Task Management System"}" <${
          config.smtp.user
        }>`,
        to: email,
        subject: "🚀 Welcome to TMS - Verify Your Account",
        text: `Hello ${firstName},\n\nWelcome to TMS (Task Management System)! Please verify your email using this link: ${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to TMS</title>
          </head>
          <body style="margin:0; padding:0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="min-height: 100vh; padding: 40px 20px;">
              <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                <tr>
                  <td>
                    <!-- Header Section -->
                    <div style="background: #ffffff; border-radius: 16px 16px 0 0; padding: 40px 30px 30px; text-align: center; position: relative; overflow: hidden;">
                      <div style="position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(102, 126, 234, 0.1); border-radius: 50%;"></div>
                      <div style="position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(118, 75, 162, 0.1); border-radius: 50%;"></div>
                      
                      <!-- TMS Logo/Icon -->
                      <div style="background: linear-gradient(135deg, #667eea, #764ba2); width: 80px; height: 80px; border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; position: relative; z-index: 1;">
                        <div style="color: white; font-size: 32px; font-weight: bold;">📋</div>
                      </div>
                      
                      <h1 style="color: #2d3748; margin: 0 0 10px; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                        Welcome to <span style="background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">TMS</span>
                      </h1>
                      <p style="color: #718096; margin: 0; font-size: 16px; font-weight: 500;">Task Management System</p>
                    </div>

                    <!-- Main Content -->
                    <div style="background: #ffffff; padding: 40px 30px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #2d3748; margin: 0 0 15px; font-size: 24px; font-weight: 600;">
                          Hi ${firstName}! 👋
                        </h2>
                        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                          You're just one step away from organizing your tasks like a pro! 
                          Please verify your email address to unlock all the powerful features of TMS.
                        </p>
                      </div>

                      <!-- Features Preview -->
                      <div style="background: #f7fafc; border-radius: 12px; padding: 25px; margin: 30px 0;">
                        <h3 style="color: #2d3748; margin: 0 0 20px; font-size: 18px; font-weight: 600; text-align: center;">
                          🎯 What awaits you in TMS:
                        </h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center;">
                          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; min-width: 140px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
                            <div style="color: #4a5568; font-size: 14px; font-weight: 500;">Task Tracking</div>
                          </div>
                          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; min-width: 140px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                            <div style="color: #4a5568; font-size: 14px; font-weight: 500;">Team Collaboration</div>
                          </div>
                          <div style="background: white; padding: 15px; border-radius: 8px; text-align: center; min-width: 140px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                            <div style="color: #4a5568; font-size: 14px; font-weight: 500;">Progress Analytics</div>
                          </div>
                        </div>
                      </div>

                      <!-- CTA Button -->
                      <div style="text-align: center; margin: 40px 0;">
                        <a href="${verificationUrl}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: #ffffff; 
                                  padding: 16px 40px; 
                                  text-decoration: none; 
                                  border-radius: 50px; 
                                  font-size: 16px; 
                                  font-weight: 600; 
                                  display: inline-block; 
                                  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                                  transition: all 0.3s ease;
                                  letter-spacing: 0.5px;">
                          🚀 Verify My Account
                        </a>
                      </div>

                      <!-- Security Notice -->
                      <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 20px; margin: 30px 0;">
                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                          <div style="color: #e53e3e; font-size: 18px; margin-top: 2px;">🔒</div>
                          <div>
                            <h4 style="color: #c53030; margin: 0 0 8px; font-size: 14px; font-weight: 600;">Security Notice</h4>
                            <p style="color: #742a2a; font-size: 14px; line-height: 1.5; margin: 0;">
                              This verification link expires in <strong>24 hours</strong> for your security. 
                              If you didn't create a TMS account, please ignore this email.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Footer -->
                    <div style="background: #2d3748; border-radius: 0 0 16px 16px; padding: 30px; text-align: center;">
                      <p style="color: #a0aec0; font-size: 14px; margin: 0 0 15px; line-height: 1.5;">
                        Having trouble with the button? Copy and paste this link:
                      </p>
                      <p style="background: #4a5568; padding: 12px; border-radius: 6px; margin: 0 0 20px;">
                        <a href="${verificationUrl}" style="color: #90cdf4; word-break: break-all; text-decoration: none; font-size: 12px;">
                          ${verificationUrl}
                        </a>
                      </p>
                      <div style="border-top: 1px solid #4a5568; padding-top: 20px;">
                        <p style="color: #718096; font-size: 12px; margin: 0;">
                          © 2024 TMS - Task Management System. All rights reserved.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </body>
          </html>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("TMS verification email sent:", info.messageId);
      return true;
    } catch (error) {
      console.error("TMS email sending failed:", error.message);
      return false;
    }
  }
}

module.exports = { EmailServiceForToken };
