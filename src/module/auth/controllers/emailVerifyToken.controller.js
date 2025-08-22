const EmailToken = require("../models/EmailToken");
const User = require("../../user/models/User");
const config = require("../../../config/config");

const emailVerifyToken = async (req, res) => {
  try {
    const { token } = req.params;

    const existingToken = await EmailToken.findOne({
      verificationToken: token,
    });

    if (!existingToken) {
      return res.redirect(
        `${config.url.frontend_url}/verification-error?reason=invalid`
      );
    }

    if (
      !existingToken.tokenExpiration ||
      new Date() > existingToken.tokenExpiration
    ) {
      await EmailToken.findByIdAndDelete(existingToken._id);
      return res.redirect(
        `${config.url.frontend_url}/verification-error?reason=expired`
      );
    }

    const user = await User.findById(existingToken.userId);

    if (!user) {
      return res.redirect(
        `${config.url.frontend_url}/verification-error?reason=user-not-found`
      );
    }

    if (user.isVerified) {
      await EmailToken.findByIdAndDelete(existingToken._id);
      return res.redirect(
        `${config.url.frontend_url}/verification-success?message=already-verified`
      );
    }

    user.isVerified = true;
    await user.save();

    await EmailToken.findByIdAndDelete(existingToken._id);

    // Redirect to frontend verification success page
    return res.redirect(`${config.url.frontend_url}/verification-success`);
  } catch (error) {
    console.error("Email verification error:", error);
    return res.redirect(
      `${config.url.frontend_url}/verification-error?reason=server`
    );
  }
};

module.exports = {
  emailVerifyToken,
};
