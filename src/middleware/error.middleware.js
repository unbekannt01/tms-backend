// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      message: `${field} already exists`,
    });
  }

  // Validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: "Validation failed",
      errors,
    });
  }

  // Default error
  res.status(500).json({
    message: "Internal server error",
  });
};

module.exports = { errorHandler };
