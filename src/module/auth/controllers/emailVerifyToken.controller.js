const EmailToken = require("../models/EmailToken")
const User = require("../../user/models/User")

const emailVerifyToken = async (req, res) => {
  try {
    const { token } = req.params

    const existingToken = await EmailToken.findOne({
      verificationToken: token,
    })

    if (!existingToken) {
      return res.status(404).send(`
        <h1>Invalid Token</h1>
        <p>The token you provided is invalid or has already been used.</p>
      `)
    }

    if (!existingToken.tokenExpiration || new Date() > existingToken.tokenExpiration) {
      await EmailToken.findByIdAndDelete(existingToken._id)
      return res.status(400).send(`
        <h1>Token Expired</h1>
        <p>This token has expired. Please request a new verification link.</p>
      `)
    }

    const user = await User.findById(existingToken.userId)

    if (!user) {
      return res.status(404).send(`
        <h1>User Not Found</h1>
        <p>We could not find a user associated with this token.</p>
      `)
    }

    user.isVerified = true
    await user.save()

    await EmailToken.findByIdAndDelete(existingToken._id)

    return res.status(200).send(`
      <div style="font-family: Arial, sans-serif; text-align:center; padding:40px;">
        <h1 style="color: green;">Email Verified Successfully</h1>
        <p>This is <strong>Development Mode</strong>. Please test locally only.</p>
        <p>You can now proceed with your development flow.</p>
      </div>
    `)
  } catch (error) {
    console.error(error)
    return res.status(500).send(`
      <h1>Server Error</h1>
      <p>Something went wrong. Please try again later.</p>
    `)
  }
}

module.exports = {
  emailVerifyToken,
}
