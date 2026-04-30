const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── USER ────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true},
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['admin', 'staff', 'kitchen', 'customer'], default: 'customer' },
  phone: { type: String, trim: true },
  avatar: { url: String, publicId: String },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ─── CATEGORY ────────────────────────────────────────────────────────────────
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  icon: { type: String, default: '🍽️' },
  description: { type: String },
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
categorySchema.index({ slug: 1, isActive: 1 });

// ─── MENU ITEM ────────────────────────────────────────────────────────────────
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  // Up to 5 images – first is the primary/cover
  images: [{
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    isCover: { type: Boolean, default: false },
  }],
  ingredients: [{ type: String }],
  allergens: [{ type: String }],
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
  },
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  isVegetarian: { type: Boolean, default: false },
  isVegan: { type: Boolean, default: false },
  isSpicy: { type: Boolean, default: false },
  isGlutenFree: { type: Boolean, default: false },
  preparationTime: { type: Number, default: 15 },
  sortOrder: { type: Number, default: 0 },
  ratings: [{ score: Number, createdAt: { type: Date, default: Date.now } }],
  totalOrders: { type: Number, default: 0 },
}, { timestamps: true });

menuItemSchema.virtual('coverImage').get(function () {
  if (!this.images || this.images.length === 0) return null;
  return this.images.find(i => i.isCover) || this.images[0];
});
menuItemSchema.virtual('avgRating').get(function () {
  if (!this.ratings || this.ratings.length === 0) return 0;
  return (this.ratings.reduce((s, r) => s + r.score, 0) / this.ratings.length).toFixed(1);
});
menuItemSchema.set('toJSON', { virtuals: true });
menuItemSchema.set('toObject', { virtuals: true });
menuItemSchema.index({ category: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

// ─── TABLE ────────────────────────────────────────────────────────────────────
const tableSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  name: { type: String, trim: true },
  capacity: { type: Number, default: 4 },
  section: { type: String, default: 'Main' }, // Indoor, Outdoor, Bar, VIP
  qrCode: { url: String, imageData: String },
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'cleaning'], default: 'available' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ─── ORDER ────────────────────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, trim: true },
  image: { type: String }, // snapshot of cover image URL
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
  tableNumber: { type: Number, required: true },
  customerName: { type: String, trim: true },
  customerPhone: { type: String, trim: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  paymentMethod: { type: String, enum: ['mpesa', 'stripe', 'cash', null], default: null },
  notes: { type: String },
  priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
  estimatedReadyAt: { type: Date },
  servedAt: { type: Date },
  cancelReason: { type: String },
  rating: { score: Number, comment: String, createdAt: Date },
  statusHistory: [{
    status: String,
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
  }],
}, { timestamps: true });

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const d = new Date();
    const prefix = `ORD-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});
orderSchema.index({ table: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

// ─── PAYMENT ──────────────────────────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'TZS' },
  method: { type: String, enum: ['mpesa', 'stripe', 'cash'], default: 'cash', required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  stripePaymentIntentId: String,
  stripeClientSecret: String,
  mpesaCheckoutRequestId: String,
  mpesaReceiptNumber: String,
  phoneNumber: String,
  metadata: mongoose.Schema.Types.Mixed,
  paidAt: Date,
}, { timestamps: true });
paymentSchema.index({ order: 1 });

// ─── REVIEW ───────────────────────────────────────────────────────────────────
const reviewSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  tableNumber: Number,
  overallRating: { type: Number, min: 1, max: 5, required: true },
  foodRating: { type: Number, min: 1, max: 5 },
  serviceRating: { type: Number, min: 1, max: 5 },
  comment: { type: String, trim: true },
  customerName: { type: String, default: 'Anonymous' },
  isVisible: { type: Boolean, default: true },
}, { timestamps: true });
reviewSchema.index({ createdAt: -1 });

module.exports = {
  User: mongoose.model('User', userSchema),
  Category: mongoose.model('Category', categorySchema),
  MenuItem: mongoose.model('MenuItem', menuItemSchema),
  Table: mongoose.model('Table', tableSchema),
  Order: mongoose.model('Order', orderSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  Review: mongoose.model('Review', reviewSchema),
};
