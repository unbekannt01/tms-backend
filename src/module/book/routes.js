const { Router } = require("express");
const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  getBooksByFilters,
  getBookRecommendations,
} = require("./controllers/book.controller");
const sessionAuthMiddleware = require("../../middleware/sessionAuth");

const router = Router();

router.post("/books", sessionAuthMiddleware, createBook);

// Specific routes first
router.get("/books/getBooks", sessionAuthMiddleware, getBooks);
router.get("/books/recommendations/:userId", getBookRecommendations);
router.get("/books", getBooksByFilters);

// Generic param routes last
router.get("/books/:id", sessionAuthMiddleware, getBookById);
router.put("/books/:id", sessionAuthMiddleware, updateBook);
router.delete("/books/:id", sessionAuthMiddleware, deleteBook);

module.exports = router;
