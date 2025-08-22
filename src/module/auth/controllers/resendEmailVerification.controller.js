const EmailToken = require("../models/EmailToken")
const User = require("../../user/models/User")
const { v4: uuidv4 } = require("uuid")
const config = require("../../../config/config")
const { EmailServiceForToken } = require("../../user/services/emailTokenService")

const emailServiceForToken = new EmailServiceForToken()

const resendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        success: false,
      })
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(404).json({
        message: "User not found with this email address",
        success: false,
      })
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        message: "User is already verified",
        success: false,
      })
    }

    // Delete any existing tokens for this user
    await EmailToken.deleteMany({ userId: user._id })

    // Generate new verification token
    const token = uuidv4()
    const tokenExpiration = new Date(Date.now() + config.emailTokenExpiration.emailTokenExpiry)

    // Create new email token
    const emailToken = new EmailToken({
      userId: user._id,
      verificationToken: token,
      tokenExpiration: tokenExpiration,
    })

    await emailToken.save()

    // Send verification email
    const emailSent = await emailServiceForToken.sendTokenEmail(user.email, token, user.firstName)

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send verification email. Please try again later.",
        success: false,
      })
    }

    res.status(200).json({
      message: "Verification email sent successfully! Please check your inbox.",
      success: true,
      expiresAt: tokenExpiration,
    })
  } catch (error) {
    console.error("Resend email verification error:", error)
    res.status(500).json({
      message: "Internal server error. Please try again later.",
      success: false,
    })
  }
}

module.exports = {
  resendEmailVerification,
}
