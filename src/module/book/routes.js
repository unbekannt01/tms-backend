const { Router } = require("express")
const {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  getBooksByFilters,
  getBookRecommendations,
} = require("./controllers/book.controller")
const authMiddleware = require("../../middleware/auth")

const router = Router()

router.post("/books", authMiddleware, createBook)

// Specific routes first
router.get("/books/getBooks", authMiddleware, getBooks)
router.get("/books/recommendations/:userId", getBookRecommendations)
router.get("/books", getBooksByFilters)

// Generic param routes last
router.get("/books/:id", authMiddleware, getBookById)
router.put("/books/:id", authMiddleware, updateBook)
router.delete("/books/:id", authMiddleware, deleteBook)

module.exports = router
