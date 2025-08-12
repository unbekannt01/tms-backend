// Generic validation middleware
const validate = (validationFunction) => {
  return (req, res, next) => {
    const validation = validationFunction(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    next();
  };
};

module.exports = { validate };
