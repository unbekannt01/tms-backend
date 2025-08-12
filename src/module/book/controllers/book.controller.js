const Book = require("../models/Book")
const User = require("../../user/models/User")
const mongoose = require("mongoose")

const createBook = async (req, res) => {
  try {
    const currentUser = req.user

    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized. Please log in." })
    }

    const { name, author, price, description, genre } = req.body

    const book = new Book({
      name,
      author,
      price,
      description,
      genre,
      userId: currentUser._id,
    })

    const savedBook = await book.save()

    res.status(201).json({
      message: "Book created successfully",
      book: savedBook,
    })
  } catch (err) {
    console.error("Create book error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getBooks = async (req, res) => {
  try {
    const books = await Book.find().populate("userId", "userName email")
    res.json(books)
  } catch (err) {
    console.error("Get books error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getBookById = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid book ID format" })
    }

    const book = await Book.findById(id).populate("userId", "userName email")

    if (!book) {
      return res.status(404).json({ message: "Book not found" })
    }

    res.json(book)
  } catch (err) {
    console.error("Get book by ID error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const updateBook = async (req, res) => {
  try {
    const { id } = req.params

    const book = await Book.findByIdAndUpdate(id, req.body, { new: true })

    if (!book) {
      return res.status(404).json({ message: "Book not found" })
    }

    res.json({
      message: "Book updated successfully",
      book,
    })
  } catch (err) {
    console.error("Update book error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const deleteBook = async (req, res) => {
  try {
    const { id } = req.params

    const book = await Book.findByIdAndDelete(id)

    if (!book) {
      return res.status(404).json({ message: "Book not found" })
    }

    res.json({ message: "Book deleted successfully" })
  } catch (err) {
    console.error("Delete book error:", err)
    res.status(500).json({ message: "Internal server error" })
  }
}

const getBooksByFilters = async (req, res) => {
  try {
    const { minPrice, maxPrice, author, sortBy = "createdAt", sortOrder = "desc" } = req.query

    const matchConditions = {}

    if (minPrice || maxPrice) {
      matchConditions.price = {}
      if (minPrice) matchConditions.price.$gte = Number.parseFloat(minPrice)
      if (maxPrice) matchConditions.price.$lte = Number.parseFloat(maxPrice)
    }

    if (author) {
      matchConditions.author = { $regex: author, $options: "i" }
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "user_1",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
    ]

    const sortObj = {}
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1
    pipeline.push({ $sort: sortObj })

    pipeline.push({
      $project: {
        name: 1,
        author: 1,
        price: 1,
        description: 1,
        genre: 1,
        createdAt: 1,
        "userInfo.userName": 1,
        "userInfo.email": 1,
      },
    })

    const result = await Book.aggregate(pipeline)

    res.json({
      message: "Books retrieved successfully",
      count: result.length,
      books: result,
    })
  } catch (error) {
    console.error("Error in getBooksByFilters:", error)
    res.status(500).json({ message: "Server Error" })
  }
}

const getBookRecommendations = async (req, res) => {
  try {
    const { userId } = req.params
    const { limit = 10 } = req.query

    const pipeline = [
      {
        $lookup: {
          from: "book",
          localField: "_id",
          foreignField: "userId",
          as: "userBooks",
        },
      },
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          userBooks: {
            $map: {
              input: "$userBooks",
              as: "book",
              in: {
                author: "$$book.author",
                price: "$$book.price",
              },
            },
          },
        },
      },
      {
        $addFields: {
          preferredAuthors: {
            $reduce: {
              input: "$userBooks",
              initialValue: [],
              in: {
                $concatArrays: ["$$value", [{ $toLower: "$$this.author" }]],
              },
            },
          },
          avgPrice: { $avg: "$userBooks.price" },
        },
      },
      {
        $lookup: {
          from: "book",
          let: {
            authors: "$preferredAuthors",
            avgPrice: "$avgPrice",
            userId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ["$userId", "$$userId"] },
                    {
                      $or: [
                        { $in: [{ $toLower: "$author" }, "$$authors"] },
                        {
                          $and: [
                            {
                              $gte: ["$price", { $multiply: ["$$avgPrice", 0.7] }],
                            },
                            {
                              $lte: ["$price", { $multiply: ["$$avgPrice", 1.3] }],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
            { $limit: Number.parseInt(limit) },
            {
              $lookup: {
                from: "user_1",
                localField: "userId",
                foreignField: "_id",
                as: "authorInfo",
              },
            },
            {
              $project: {
                name: 1,
                author: 1,
                price: 1,
                description: 1,
                createdAt: 1,
                "authorInfo.userName": 1,
                "authorInfo.email": 1,
              },
            },
          ],
          as: "recommendations",
        },
      },
      {
        $project: {
          recommendations: 1,
        },
      },
    ]

    const result = await User.aggregate(pipeline)

    res.json({
      message: "Book recommendations retrieved successfully",
      recommendations: result[0]?.recommendations || [],
    })
  } catch (error) {
    console.error("Error in getBookRecommendations:", error)
    res.status(500).json({ message: "Server Error" })
  }
}

module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  getBooksByFilters,
  getBookRecommendations,
}
