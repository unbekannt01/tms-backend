// config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer with upload-time transformations
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "tms-avatars", // Folder in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 200, height: 200, crop: "fill", gravity: "face" }, // Resize avatar to 200x200, focus on face
      { quality: "auto" }, // Auto compress to smallest size while keeping quality
      { fetch_format: "auto" }, // Auto convert to WebP/AVIF if supported
    ],
  },
});

// Multer upload setup (no fileSize limit, backend handles any size)
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

module.exports = { cloudinary, upload };
