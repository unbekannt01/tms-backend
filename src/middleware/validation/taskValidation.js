const { body, param } = require("express-validator")

const validateTaskDescription = [
  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters")
    .trim(),
]

const validateTaskId = [param("id").isMongoId().withMessage("Invalid task ID format")]

const validateTaskCreation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be between 3 and 200 characters")
    .trim(),
  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters")
    .trim(),
  body("priority")
    .optional()
    .isIn(["low", "medium", "high", "urgent"])
    .withMessage("Priority must be one of: low, medium, high, urgent"),
  body("dueDate").optional().isISO8601().withMessage("Due date must be a valid date"),
  body("estimatedHours").optional().isFloat({ min: 0 }).withMessage("Estimated hours must be a positive number"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tag must be between 1 and 50 characters"),
]

module.exports = {
  validateTaskDescription,
  validateTaskId,
  validateTaskCreation,
}
