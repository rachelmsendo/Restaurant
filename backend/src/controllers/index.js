const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { User, Category, MenuItem, Table, Order, Payment, Review } = require('../models');
const { uploadMenuImages, uploadAvatar, deleteImage } = require('../config/cloudinary');
const { emitNewOrder, emitOrderStatusUpdate, emitPaymentSuccess } = require('../sockets');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── AUTH ──────────────────────────────────────────────────────────────────────
const authController = {
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });
      if (!user.isActive) return res.status(403).json({ success: false, message: 'Account disabled' });
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
      const token = signToken(user._id);
      res.json({ success: true, data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } } });
    } catch (err) { next(err); }
  },
  register: async (req, res, next) => {
    try {
      const { name, email, password, role, phone } = req.body;
      const user = await User.create({ name, email, password, role: role || 'staff', phone });
      if (req.file) { user.avatar = { url: req.file.path, publicId: req.file.filename }; await user.save(); }
      const token = signToken(user._id);
      res.status(201).json({ success: true, data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } } });
    } catch (err) { next(err); }
  },
  me: async (req, res) => res.json({ success: true, data: { user: req.user } }),
  updateProfile: async (req, res, next) => {
    try {
      const { name, phone } = req.body;
      const updates = { name, phone };
      if (req.file) updates.avatar = { url: req.file.path, publicId: req.file.filename };
      const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
      res.json({ success: true, data: { user } });
    } catch (err) { next(err); }
  },
};

// ── STAFF / USER MANAGEMENT ───────────────────────────────────────────────────
const staffController = {
  getAll: async (req, res, next) => {
    try {
      const users = await User.find({}).sort('-createdAt');
      res.json({ success: true, data: { users } });
    } catch (err) { next(err); }
  },
  getOne: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (err) { next(err); }
  },
  update: async (req, res, next) => {
    try {
      const { name, email, role, phone, isActive } = req.body;
      const updates = { name, email, role, phone, isActive };
      if (req.file) updates.avatar = { url: req.file.path, publicId: req.file.filename };
      // If password provided, hash via model
      if (req.body.password) {
        const user = await User.findById(req.params.id);
        user.set({ ...updates, password: req.body.password });
        await user.save();
        return res.json({ success: true, data: { user } });
      }
      const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.json({ success: true, data: { user } });
    } catch (err) { next(err); }
  },
  delete: async (req, res, next) => {
    try {
      if (req.params.id === req.user._id.toString()) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
      await User.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Staff member removed' });
    } catch (err) { next(err); }
  },
  toggleActive: async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.isActive = !user.isActive;
      await user.save({ validateBeforeSave: false });
      res.json({ success: true, data: { user } });
    } catch (err) { next(err); }
  },
};

// ── MENU ──────────────────────────────────────────────────────────────────────
const menuController = {
  getFullMenu: async (req, res, next) => {
    try {
      const categories = await Category.find({ isActive: true }).sort('sortOrder');
      const items = await MenuItem.find({ isAvailable: true }).populate('category', 'name slug icon').sort('sortOrder');
      const menu = categories.map(cat => ({
        ...cat.toObject(),
        items: items.filter(item => item.category._id.toString() === cat._id.toString()),
      }));
      res.json({ success: true, data: { menu } });
    } catch (err) { next(err); }
  },
  getItems: async (req, res, next) => {
    try {
      const { category, search, isAvailable, page = 1, limit = 50 } = req.query;
      const filter = {};
      if (category) filter.category = category;
      if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
      if (search) filter.$text = { $search: search };
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [items, total] = await Promise.all([
        MenuItem.find(filter).populate('category', 'name slug icon').sort('sortOrder').skip(skip).limit(parseInt(limit)),
        MenuItem.countDocuments(filter),
      ]);
      res.json({ success: true, data: { items, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
    } catch (err) { next(err); }
  },
  getItem: async (req, res, next) => {
    try {
      const item = await MenuItem.findById(req.params.id).populate('category', 'name slug icon');
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
      res.json({ success: true, data: { item } });
    } catch (err) { next(err); }
  },
  createItem: async (req, res, next) => {
    try {
      const itemData = { ...req.body };
      if (req.body.ingredients && typeof req.body.ingredients === 'string') {
        try { itemData.ingredients = JSON.parse(req.body.ingredients); } catch { itemData.ingredients = []; }
      }
      if (req.body.allergens && typeof req.body.allergens === 'string') {
        try { itemData.allergens = JSON.parse(req.body.allergens); } catch { itemData.allergens = []; }
      }
      if (req.files && req.files.length > 0) {
        itemData.images = req.files.map((f, idx) => ({ url: f.path, publicId: f.filename, isCover: idx === 0 }));
      }
      const item = await MenuItem.create(itemData);
      await item.populate('category', 'name slug icon');
      res.status(201).json({ success: true, data: { item } });
    } catch (err) { next(err); }
  },
  updateItem: async (req, res, next) => {
    try {
      const item = await MenuItem.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
      const updateData = { ...req.body };
      if (req.body.ingredients && typeof req.body.ingredients === 'string') {
        try { updateData.ingredients = JSON.parse(req.body.ingredients); } catch { updateData.ingredients = []; }
      }
      if (req.body.allergens && typeof req.body.allergens === 'string') {
        try { updateData.allergens = JSON.parse(req.body.allergens); } catch { updateData.allergens = []; }
      }
      // Append new images, keeping existing ones (up to 5 total)
      if (req.files && req.files.length > 0) {
        const existingImages = item.images || [];
        const newImages = req.files.map((f, idx) => ({ url: f.path, publicId: f.filename, isCover: existingImages.length === 0 && idx === 0 }));
        const combined = [...existingImages, ...newImages].slice(0, 5);
        updateData.images = combined;
      }
      // Remove specific images by publicId
      if (req.body.removeImages) {
        let toRemove = [];
        try { toRemove = JSON.parse(req.body.removeImages); } catch {}
        for (const pid of toRemove) await deleteImage(pid);
        updateData.images = (updateData.images || item.images).filter(i => !toRemove.includes(i.publicId));
        if (updateData.images.length > 0 && !updateData.images.find(i => i.isCover)) {
          updateData.images[0].isCover = true;
        }
      }
      // Set cover image
      if (req.body.coverImagePublicId && updateData.images) {
        updateData.images = updateData.images.map(i => ({ ...i.toObject ? i.toObject() : i, isCover: i.publicId === req.body.coverImagePublicId }));
      }
      const updated = await MenuItem.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).populate('category', 'name slug icon');
      res.json({ success: true, data: { item: updated } });
    } catch (err) { next(err); }
  },
  deleteItem: async (req, res, next) => {
    try {
      const item = await MenuItem.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
      for (const img of item.images || []) await deleteImage(img.publicId);
      await item.deleteOne();
      res.json({ success: true, message: 'Item deleted' });
    } catch (err) { next(err); }
  },
  rateItem: async (req, res, next) => {
    try {
      const { score } = req.body;
      if (!score || score < 1 || score > 5) return res.status(400).json({ success: false, message: 'Score must be 1-5' });
      await MenuItem.findByIdAndUpdate(req.params.id, { $push: { ratings: { score: parseInt(score) } }, $inc: { totalOrders: 0 } });
      res.json({ success: true, message: 'Rating added' });
    } catch (err) { next(err); }
  },
};

// ── CATEGORIES ────────────────────────────────────────────────────────────────
const categoryController = {
  getAll: async (req, res, next) => {
    try {
      const categories = await Category.find({}).sort('sortOrder');
      res.json({ success: true, data: { categories } });
    } catch (err) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const { name, icon, description, sortOrder } = req.body;
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const category = await Category.create({ name, slug, icon, description, sortOrder });
      res.status(201).json({ success: true, data: { category } });
    } catch (err) { next(err); }
  },
  update: async (req, res, next) => {
    try {
      const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
      res.json({ success: true, data: { category } });
    } catch (err) { next(err); }
  },
  delete: async (req, res, next) => {
    try {
      await Category.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: 'Category deleted' });
    } catch (err) { next(err); }
  },
};

// ── TABLES ────────────────────────────────────────────────────────────────────
const tableController = {
  getAll: async (req, res, next) => {
    try {
      const tables = await Table.find({ isActive: true }).sort('number');
      res.json({ success: true, data: { tables } });
    } catch (err) { next(err); }
  },
  getOne: async (req, res, next) => {
    try {
      const table = await Table.findById(req.params.id);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
      res.json({ success: true, data: { table } });
    } catch (err) { next(err); }
  },
  create: async (req, res, next) => {
    try {
      const { number, name, capacity, section } = req.body;
      const table = await Table.create({ number, name: name || `Table ${number}`, capacity, section });
      const menuUrl = `${process.env.FRONTEND_URL}/menu?table=${table._id}`;
      const qrImageData = await QRCode.toDataURL(menuUrl, { width: 400, margin: 2 });
      table.qrCode = { url: menuUrl, imageData: qrImageData };
      await table.save();
      res.status(201).json({ success: true, data: { table } });
    } catch (err) { next(err); }
  },
  update: async (req, res, next) => {
    try {
      const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
      res.json({ success: true, data: { table } });
    } catch (err) { next(err); }
  },
  delete: async (req, res, next) => {
    try {
      await Table.findByIdAndUpdate(req.params.id, { isActive: false });
      res.json({ success: true, message: 'Table removed' });
    } catch (err) { next(err); }
  },
  regenerateQR: async (req, res, next) => {
    try {
      const table = await Table.findById(req.params.id);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
      const menuUrl = `${process.env.FRONTEND_URL}/menu?table=${table._id}`;
      const qrImageData = await QRCode.toDataURL(menuUrl, { width: 400, margin: 2 });
      table.qrCode = { url: menuUrl, imageData: qrImageData };
      await table.save();
      res.json({ success: true, data: { table } });
    } catch (err) { next(err); }
  },
};

// ── ORDERS ────────────────────────────────────────────────────────────────────
const orderController = {
create: async (req, res, next) => {
  try {
    const {
      tableId,
      items,
      customerName,
      customerPhone, // ✅ REQUIRED
      notes
    } = req.body;

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for communication'
      });
    }

    const table = await Table.findById(tableId);
    if (!table)
      return res.status(404).json({ success: false, message: 'Table not found' });

    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      isAvailable: true
    });

    const orderItems = items.map(item => {
      const mi = menuItems.find(m => m._id.toString() === item.menuItemId);
      if (!mi) throw { statusCode: 400, message: `Item not available` };

      return {
        menuItem: mi._id,
        name: mi.name,
        price: mi.price,
        quantity: item.quantity,
        notes: item.notes,
        image: mi.images?.[0]?.url
      };
    });

    const subtotal = orderItems.reduce(
      (s, i) => s + i.price * i.quantity,
      0
    );

    const tax = Math.round(subtotal * 0.16);
    const total = subtotal + tax;

    const order = await Order.create({
      table: tableId,
      tableNumber: table.number,
      customerName,
      customerPhone, // ✅ SAVE PHONE
      items: orderItems,
      subtotal,
      tax,
      total,
      notes,
      statusHistory: [{ status: 'pending' }],
    });

    await MenuItem.updateMany(
      { _id: { $in: menuItemIds } },
      { $inc: { totalOrders: 1 } }
    );

    await Table.findByIdAndUpdate(tableId, { status: 'occupied' });

    await order.populate([{ path: 'table', select: 'number name section' }]);

    emitNewOrder(order);

    res.status(201).json({ success: true, data: { order } });
  } catch (err) {
    next(err);
  }
},
  getAll: async (req, res, next) => {
    try {
      const { status, tableId, date, startDate, endDate, paymentStatus, page = 1, limit = 30 } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (tableId) filter.table = tableId;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (date) { const s = new Date(date); s.setHours(0,0,0,0); const e = new Date(date); e.setHours(23,59,59,999); filter.createdAt = { $gte: s, $lte: e }; }
      else if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); filter.createdAt.$lte = e; }
      }
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [orders, total] = await Promise.all([
        Order.find(filter).populate('table', 'number name section').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
        Order.countDocuments(filter),
      ]);
      res.json({ success: true, data: { orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
    } catch (err) { next(err); }
  },
  getOne: async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id).populate('table', 'number name section').populate('items.menuItem', 'name images category');
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      res.json({ success: true, data: { order } });
    } catch (err) { next(err); }
  },
  getByTable: async (req, res, next) => {
    try {
      const orders = await Order.find({ table: req.params.tableId }).populate('items.menuItem', 'name images').sort({ createdAt: -1 }).limit(10);
      res.json({ success: true, data: { orders } });
    } catch (err) { next(err); }
  },
  updateStatus: async (req, res, next) => {
    try {
      const { status, note } = req.body;
      const validTransitions = { pending: ['confirmed','cancelled'], confirmed: ['preparing','cancelled'], preparing: ['ready'], ready: ['delivered'], delivered: [], cancelled: [] };
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (!validTransitions[order.status]?.includes(status)) return res.status(400).json({ success: false, message: `Cannot transition from ${order.status} to ${status}` });
      order.status = status;
      order.statusHistory.push({ status, updatedBy: req.user?._id, note });
      if (status === 'preparing') order.estimatedReadyAt = new Date(Date.now() + 20 * 60000);
      if (status === 'delivered') order.servedAt = new Date();
      if (status === 'cancelled' && req.body.cancelReason) order.cancelReason = req.body.cancelReason;
      await order.save();
      emitOrderStatusUpdate(order);
      res.json({ success: true, data: { order } });
    } catch (err) { next(err); }
  },
  updatePriority: async (req, res, next) => {
    try {
      const order = await Order.findByIdAndUpdate(req.params.id, { priority: req.body.priority }, { new: true });
      res.json({ success: true, data: { order } });
    } catch (err) { next(err); }
  },
  addRating: async (req, res, next) => {
    try {
      const { score, comment } = req.body;
      await Order.findByIdAndUpdate(req.params.id, { rating: { score, comment, createdAt: new Date() } });
      res.json({ success: true, message: 'Rating submitted' });
    } catch (err) { next(err); }
  },
};

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const paymentController = {
  initiateStripe: async (req, res, next) => {
    try {
      const { orderId } = req.body;
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.paymentStatus === 'paid') return res.status(400).json({ success: false, message: 'Already paid' });
      const pi = await stripe.paymentIntents.create({ amount: Math.round(order.total * 100), currency: 'kes', metadata: { orderId, orderNumber: order.orderNumber } });
      await Payment.create({ order: orderId, amount: order.total, currency: 'TZS', method: 'stripe', status: 'pending', stripePaymentIntentId: pi.id, stripeClientSecret: pi.client_secret });
      res.json({ success: true, data: { clientSecret: pi.client_secret } });
    } catch (err) { next(err); }
  },
initiateMobileMoney: async (req, res, next) => {
  try {
    const { orderId, phoneNumber, provider } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const supported = [
      'mpesa',
      'tigopesa',
      'airtelmoney',
      'halopesa',
      'mixx',
    ];

    if (!supported.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported mobile money provider',
      });
    }

    // 🔥 universal reference (NO mpesa naming)
    const providerReference = `${provider.toUpperCase()}-${Date.now()}`;

    const payment = await Payment.create({
      order: orderId,
      amount: order.total,
      currency: 'TZS',
      method: provider,
      status: 'pending',
      providerReference,
      phoneNumber,
    });

    // 🔥 simulate async provider callback (same for ALL providers)
    setTimeout(async () => {
      const providerReceipt = `RCPT-${provider.toUpperCase()}-${Date.now()}`;

      await Payment.findByIdAndUpdate(payment._id, {
        status: 'completed',
        providerReceipt,
        paidAt: new Date(),
      });

      await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'paid',
        paymentMethod: provider,
      });

      const updatedOrder = await Order.findById(orderId);
      emitPaymentSuccess(updatedOrder, { amount: order.total });
    }, 5000);

    res.json({
      success: true,
      data: {
        message: `${provider} payment initiated`,
        providerReference,
        paymentId: payment._id,
      },
    });
  } catch (err) {
    next(err);
  }
},
  stripeWebhook: async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const payment = await Payment.findOne({ stripePaymentIntentId: pi.id });
      if (payment) { payment.status = 'completed'; payment.paidAt = new Date(); await payment.save(); await Order.findByIdAndUpdate(payment.order, { paymentStatus: 'paid', paymentMethod: 'stripe' }); const order = await Order.findById(payment.order); emitPaymentSuccess(order, payment); }
    }
    res.json({ received: true });
  },
  checkStatus: async (req, res, next) => {
    try {
      const payment = await Payment.findById(req.params.id).populate('order', 'orderNumber status paymentStatus');
      if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
      res.json({ success: true, data: { payment } });
    } catch (err) { next(err); }
  },
};

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
const analyticsController = {
  overview: async (req, res, next) => {
    try {
      const { period = '7d', startDate, endDate } = req.query;
      const range = buildDateRange(period, startDate, endDate);

      const [revenueByDay, totals, statusBreakdown, topItems, paymentMethods, hourlyHeatmap, tableStats] = await Promise.all([
        // Revenue per day
        Order.aggregate([
          { $match: { paymentStatus: 'paid', createdAt: { $gte: range.start, $lte: range.end } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 }, avgValue: { $avg: '$total' } } },
          { $sort: { _id: 1 } },
        ]),
        // Overall totals
        Order.aggregate([
          { $match: { createdAt: { $gte: range.start, $lte: range.end } } },
          { $group: { _id: null, totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } }, totalOrders: { $sum: 1 }, avgOrderValue: { $avg: '$total' }, totalItems: { $sum: { $sum: '$items.quantity' } }, cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } } } },
        ]),
        // Status breakdown
        Order.aggregate([
          { $match: { createdAt: { $gte: range.start, $lte: range.end } } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        // Top selling items
        Order.aggregate([
          { $match: { createdAt: { $gte: range.start, $lte: range.end } } },
          { $unwind: '$items' },
          { $group: { _id: '$items.name', count: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }, image: { $first: '$items.image' } } },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
        ]),
        // Payment method split
        Order.aggregate([
          { $match: { paymentStatus: 'paid', createdAt: { $gte: range.start, $lte: range.end } } },
          { $group: { _id: '$paymentMethod', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
        ]),
        // Hourly order distribution (heatmap)
        Order.aggregate([
          { $match: { createdAt: { $gte: range.start, $lte: range.end } } },
          { $group: { _id: { hour: { $hour: '$createdAt' }, dow: { $dayOfWeek: '$createdAt' } }, count: { $sum: 1 } } },
          { $sort: { '_id.dow': 1, '_id.hour': 1 } },
        ]),
        // Table revenue
        Order.aggregate([
          { $match: { paymentStatus: 'paid', createdAt: { $gte: range.start, $lte: range.end } } },
          { $group: { _id: '$tableNumber', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
        ]),
      ]);

      // Comparison with previous period
      const prevRange = buildPrevRange(period, range);
      const prevTotals = await Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: prevRange.start, $lte: prevRange.end } } },
        { $group: { _id: null, totalRevenue: { $sum: '$total' }, totalOrders: { $sum: 1 } } },
      ]);

      const current = totals[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, totalItems: 0, cancelledOrders: 0 };
      const previous = prevTotals[0] || { totalRevenue: 0, totalOrders: 0 };
      const revenueGrowth = previous.totalRevenue > 0 ? (((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100).toFixed(1) : null;
      const ordersGrowth = previous.totalOrders > 0 ? (((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100).toFixed(1) : null;

      res.json({
        success: true,
        data: {
          period: { start: range.start, end: range.end, label: period },
          totals: { ...current, revenueGrowth, ordersGrowth },
          revenueByDay,
          statusBreakdown: Object.fromEntries(statusBreakdown.map(s => [s._id, s.count])),
          topItems,
          paymentMethods,
          hourlyHeatmap,
          tableStats,
        },
      });
    } catch (err) { next(err); }
  },

  todayStats: async (req, res, next) => {
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const [todayData, statusBreakdown, recentOrders] = await Promise.all([
        Order.aggregate([{ $match: { createdAt: { $gte: today } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus','paid'] },'$total', 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status','pending'] }, 1, 0] } }, preparing: { $sum: { $cond: [{ $in: ['$status',['confirmed','preparing']] }, 1, 0] } }, ready: { $sum: { $cond: [{ $eq: ['$status','ready'] }, 1, 0] } } } }]),
        Order.aggregate([{ $match: { createdAt: { $gte: today } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        Order.find({ createdAt: { $gte: today } }).sort({ createdAt: -1 }).limit(5).populate('table', 'number name'),
      ]);
      res.json({ success: true, data: { today: todayData[0] || { count:0, revenue:0, pending:0, preparing:0, ready:0 }, statusBreakdown, recentOrders } });
    } catch (err) { next(err); }
  },

  exportCSV: async (req, res, next) => {
    try {
      const { period = '7d', startDate, endDate } = req.query;
      const range = buildDateRange(period, startDate, endDate);
      const orders = await Order.find({ createdAt: { $gte: range.start, $lte: range.end } }).populate('table','number name').sort({ createdAt: -1 });
      const { stringify } = require('csv-stringify/sync');
      const rows = [['Order #','Date','Time','Table','Customer','Items','Subtotal','Tax','Total','Status','Payment Status','Payment Method']];
      for (const o of orders) {
        rows.push([
          o.orderNumber,
          o.createdAt.toLocaleDateString('en-TZ'),
          o.createdAt.toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' }),
          `Table ${o.tableNumber}`,
          o.customerName || 'Anonymous',
          o.items.map(i => `${i.name} x${i.quantity}`).join(' | '),
          o.subtotal.toFixed(2),
          o.tax.toFixed(2),
          o.total.toFixed(2),
          o.status,
          o.paymentStatus,
          o.paymentMethod || 'N/A',
        ]);
      }
      const csv = stringify(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${period}-${Date.now()}.csv`);
      res.send(csv);
    } catch (err) { next(err); }
  },

  exportPDF: async (req, res, next) => {
    try {
      const { period = '7d', startDate, endDate } = req.query;
      const range = buildDateRange(period, startDate, endDate);

      const [orders, analytics] = await Promise.all([
        Order.find({ createdAt: { $gte: range.start, $lte: range.end } }).populate('table','number').sort({ createdAt: -1 }),
        Order.aggregate([
          { $match: { createdAt: { $gte: range.start, $lte: range.end } } },
          { $group: { _id: null, totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus','paid'] }, '$total', 0] } }, totalOrders: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ['$paymentStatus','paid'] }, 1, 0] } }, avgOrder: { $avg: '$total' } } },
        ]),
      ]);

      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${period}-${Date.now()}.pdf`);
      doc.pipe(res);

      const stats = analytics[0] || { totalRevenue: 0, totalOrders: 0, paid: 0, avgOrder: 0 };
      const fmt = (n) => `TSH ${Number(n).toLocaleString('en-TZ', { minimumFractionDigits: 2 })}`;
      const BRAND = '#f97316';
      const DARK = '#1c1917';
      const MID = '#78716c';
      const LIGHT = '#f5f5f4';

      // Header bar
      doc.rect(0, 0, doc.page.width, 80).fill(DARK);
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('RestaurantOS', 50, 22);
      doc.fillColor('#f97316').fontSize(11).font('Helvetica').text('Sales Report', 50, 48);
      doc.fillColor('#a8a29e').fontSize(9).text(`Generated: ${new Date().toLocaleString('en-TZ')}`, 350, 48, { align: 'right', width: 200 });

      // Period badge
      doc.y = 100;
      doc.fillColor(BRAND).fontSize(10).font('Helvetica-Bold')
        .text(`Report Period: ${range.start.toLocaleDateString('en-TZ')} — ${range.end.toLocaleDateString('en-TZ')}`, 50, doc.y, { align: 'center' });

      // Summary cards (4 across)
      doc.y += 20;
      const cardY = doc.y;
      const cardW = 115; const cardH = 65; const cardGap = 10; let cx = 50;
      const summaryCards = [
        { label: 'Total Revenue', value: fmt(stats.totalRevenue), color: '#16a34a' },
        { label: 'Total Orders', value: String(stats.totalOrders), color: '#2563eb' },
        { label: 'Paid Orders', value: String(stats.paid), color: BRAND },
        { label: 'Avg. Order Value', value: fmt(stats.avgOrder), color: '#7c3aed' },
      ];
      for (const card of summaryCards) {
        doc.rect(cx, cardY, cardW, cardH).fill(LIGHT);
        doc.fillColor(card.color).fontSize(16).font('Helvetica-Bold').text(card.value, cx + 8, cardY + 12, { width: cardW - 16 });
        doc.fillColor(MID).fontSize(8).font('Helvetica').text(card.label, cx + 8, cardY + 40, { width: cardW - 16 });
        cx += cardW + cardGap;
      }
      doc.y = cardY + cardH + 20;

      // Section: Orders table
      doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text('Order Details', 50, doc.y);
      doc.moveDown(0.5);

      // Table header
      const cols = [50, 130, 210, 285, 360, 425, 490];
      const headers = ['Order #', 'Date', 'Table', 'Customer', 'Total', 'Status', 'Payment'];
      doc.rect(50, doc.y, doc.page.width - 100, 20).fill(DARK);
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, cols[i] + 3, doc.y - 14, { width: (cols[i+1] || 560) - cols[i] - 6 }));
      doc.y += 8;

      // Table rows
      orders.slice(0, 80).forEach((order, idx) => {
        if (doc.y > 720) { doc.addPage(); doc.y = 50; }
        const rowY = doc.y;
        if (idx % 2 === 0) doc.rect(50, rowY, doc.page.width - 100, 18).fill('#fafaf9');
        doc.fillColor(DARK).fontSize(7.5).font('Helvetica');
const STATUS_COLORS = {
  delivered: '#16a34a',
  pending: '#d97706',
  preparing: '#ea580c',
  ready: '#2563eb',
  cancelled: '#dc2626',
  confirmed: '#0891b2'
};        const row = [
          order.orderNumber,
          order.createdAt.toLocaleDateString('en-TZ'),
          `T${order.tableNumber}`,
          (order.customerName || 'Anonymous').slice(0, 12),
          fmt(order.total),
          order.status,
          order.paymentStatus,
        ];
        row.forEach((cell, i) => {
          if (i === 5) doc.fillColor(STATUS_COLORS[cell] || DARK);
          else doc.fillColor(DARK);
          doc.text(cell, cols[i] + 3, rowY + 5, { width: (cols[i+1] || 560) - cols[i] - 6 });
        });
        doc.y = rowY + 18;
      });

      if (orders.length > 80) {
        doc.fillColor(MID).fontSize(8).text(`... and ${orders.length - 80} more orders. Export CSV for full list.`, 50, doc.y + 5);
      }

      // Footer
      const pages = doc.bufferedPageRange ? doc.bufferedPageRange() : { count: 1 };
      doc.rect(0, doc.page.height - 35, doc.page.width, 35).fill(DARK);
      doc.fillColor('#a8a29e').fontSize(8).text('RestaurantOS · Confidential Sales Report', 50, doc.page.height - 22, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    } catch (err) { next(err); }
  },
};

// ── REVIEWS ───────────────────────────────────────────────────────────────────
const reviewController = {
  create: async (req, res, next) => {
    try {
      const { orderId, overallRating, foodRating, serviceRating, comment, customerName } = req.body;
      const order = await Order.findById(orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      const review = await Review.create({ order: orderId, table: order.table, tableNumber: order.tableNumber, overallRating, foodRating, serviceRating, comment, customerName: customerName || order.customerName });
      res.status(201).json({ success: true, data: { review } });
    } catch (err) { next(err); }
  },
  getAll: async (req, res, next) => {
    try {
      const reviews = await Review.find({ isVisible: true }).sort({ createdAt: -1 }).limit(50);
      const stats = await Review.aggregate([{ $group: { _id: null, avg: { $avg: '$overallRating' }, total: { $sum: 1 }, food: { $avg: '$foodRating' }, service: { $avg: '$serviceRating' } } }]);
      res.json({ success: true, data: { reviews, stats: stats[0] || { avg: 0, total: 0, food: 0, service: 0 } } });
    } catch (err) { next(err); }
  },
};

// ── HELPERS ───────────────────────────────────────────────────────────────────
function buildDateRange(period, startDate, endDate) {
  if (startDate && endDate) {
    const s = new Date(startDate); s.setHours(0,0,0,0);
    const e = new Date(endDate); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }
  const end = new Date(); end.setHours(23,59,59,999);
  const days = { '1d':1,'7d':7,'30d':30,'60d':60,'90d':90,'1y':365 }[period] || 7;
  const start = new Date(end - days * 86400000); start.setHours(0,0,0,0);
  return { start, end };
}
function buildPrevRange(period, range) {
  const diff = range.end - range.start;
  return { start: new Date(range.start - diff), end: new Date(range.end - diff) };
}

module.exports = { authController, staffController, menuController, categoryController, tableController, orderController, paymentController, analyticsController, reviewController };
