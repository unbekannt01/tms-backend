// Simple validation functions for JavaScript
const validateCreateUser = (data) => {
  const errors = [];

//   if (
//     !data.firstName ||
//     typeof data.firstName !== "string" ||
//     data.firstName.trim() === ""
//   ) {
//     errors.push("firstName is required and must be a non-empty string");
//   }

//   if (
//     !data.lastName ||
//     typeof data.lastName !== "string" ||
//     data.lastName.trim() === ""
//   ) {
//     errors.push("lastName is required and must be a non-empty string");
//   }

//   if (
//     !data.userName ||
//     typeof data.userName !== "string" ||
//     data.userName.trim() === ""
//   ) {
//     errors.push("userName is required and must be a non-empty string");
//   }

//   if (
//     !data.email ||
//     typeof data.email !== "string" ||
//     data.email.trim() === ""
//   ) {
//     errors.push("email is required");
//   } else {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(data.email)) {
//       errors.push("email must be a valid email address");
//     }
//   }

//   if (
//     !data.password ||
//     typeof data.password !== "string" ||
//     data.password.trim() === ""
//   ) {
//     errors.push("password is required and must be a non-empty string");
//   }

//   if (!data.age || typeof data.age !== "number" || data.age <= 0) {
//     errors.push("age is required and must be a positive number");
//   }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = { validateCreateUser };
