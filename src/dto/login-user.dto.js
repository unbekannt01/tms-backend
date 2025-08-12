// Simple validation functions for JavaScript
const validateLoginUser = (data) => {
  const errors = [];

//   if (
//     !data.emailOrUserName ||
//     typeof data.emailOrUserName !== "string" ||
//     data.emailOrUserName.trim() === ""
//   ) {
//     errors.push("emailOrUserName is required and must be a non-empty string");
//   }

//   if (
//     !data.password ||
//     typeof data.password !== "string" ||
//     data.password.trim() === ""
//   ) {
//     errors.push("password is required and must be a non-empty string");
//   }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = { validateLoginUser };
