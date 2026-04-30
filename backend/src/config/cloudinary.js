const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multi-image storage for menu items (up to 5)
const menuStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'restaurantOS/menu',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, height: 750, crop: 'fill', quality: 'auto:good' }],
  },
});

// Avatar storage for staff
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'restaurantOS/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', quality: 'auto' }],
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const uploadMenuImages = multer({
  storage: menuStorage,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter,
}).array('images', 5);

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  fileFilter,
}).single('avatar');

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary delete error:', err.message);
  }
};

module.exports = { cloudinary, uploadMenuImages, uploadAvatar, deleteImage };
