require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const { initSocket } = require('./sockets');
const errorHandler = require('./middleware/errorHandler');
const { authenticate, authorize } = require('./middleware/auth');
const { uploadMenuImages, uploadAvatar } = require('./config/cloudinary');
const {
  authController, staffController, menuController, categoryController,
  tableController, orderController, paymentController, analyticsController, reviewController
} = require('./controllers');

const app = express();
const server = http.createServer(app);
initSocket(server);
connectDB();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date(), uptime: process.uptime() }));

const R = express.Router;

// ── AUTH ──────────────────────────────────────────────────────────────────────
const authR = R();
authR.post('/login', authController.login);
authR.post('/register', authenticate, authorize('admin'), uploadAvatar, authController.register);
authR.get('/me', authenticate, authController.me);
authR.put('/profile', authenticate, uploadAvatar, authController.updateProfile);
app.use('/api/auth', authR);

// ── STAFF ─────────────────────────────────────────────────────────────────────
const staffR = R();
staffR.get('/', authenticate, authorize('admin'), staffController.getAll);
staffR.get('/:id', authenticate, authorize('admin'), staffController.getOne);
staffR.put('/:id', authenticate, authorize('admin'), uploadAvatar, staffController.update);
staffR.delete('/:id', authenticate, authorize('admin'), staffController.delete);
staffR.patch('/:id/toggle-active', authenticate, authorize('admin'), staffController.toggleActive);
app.use('/api/staff', staffR);

// ── MENU ──────────────────────────────────────────────────────────────────────
const menuR = R();
menuR.get('/', menuController.getFullMenu);
menuR.get('/items', menuController.getItems);
menuR.get('/items/:id', menuController.getItem);
menuR.post('/items', authenticate, authorize('admin'), uploadMenuImages, menuController.createItem);
menuR.put('/items/:id', authenticate, authorize('admin'), uploadMenuImages, menuController.updateItem);
menuR.delete('/items/:id', authenticate, authorize('admin'), menuController.deleteItem);
menuR.post('/items/:id/rate', menuController.rateItem);
app.use('/api/menu', menuR);

// ── CATEGORIES ────────────────────────────────────────────────────────────────
const catR = R();
catR.get('/', categoryController.getAll);
catR.post('/', authenticate, authorize('admin'), categoryController.create);
catR.put('/:id', authenticate, authorize('admin'), categoryController.update);
catR.delete('/:id', authenticate, authorize('admin'), categoryController.delete);
app.use('/api/categories', catR);

// ── TABLES ────────────────────────────────────────────────────────────────────
const tableR = R();
tableR.get('/', authenticate, authorize('admin', 'staff'), tableController.getAll);
tableR.get('/:id', tableController.getOne);
tableR.post('/', authenticate, authorize('admin'), tableController.create);
tableR.put('/:id', authenticate, authorize('admin'), tableController.update);
tableR.delete('/:id', authenticate, authorize('admin'), tableController.delete);
tableR.post('/:id/regenerate-qr', authenticate, authorize('admin'), tableController.regenerateQR);
app.use('/api/tables', tableR);

// ── ORDERS ────────────────────────────────────────────────────────────────────
const orderR = R();
orderR.post('/', orderController.create);
orderR.get('/', authenticate, authorize('admin', 'staff', 'kitchen'), orderController.getAll);
orderR.get('/table/:tableId', orderController.getByTable);
orderR.get('/:id', orderController.getOne);
orderR.put('/:id/status', authenticate, authorize('admin', 'staff', 'kitchen'), orderController.updateStatus);
orderR.patch('/:id/priority', authenticate, authorize('admin', 'staff', 'kitchen'), orderController.updatePriority);
orderR.post('/:id/rate', orderController.addRating);
app.use('/api/orders', orderR);

// ── PAYMENTS ──────────────────────────────────────────────────────────────────
const payR = R();
payR.post('/stripe/initiate', paymentController.initiateStripe);
payR.post('/mpesa/initiate', paymentController.initiateMpesa);
payR.post('/webhook', paymentController.stripeWebhook);
payR.get('/:id/status', paymentController.checkStatus);
app.use('/api/payments', payR);

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
const analyticsR = R();
analyticsR.get('/overview', authenticate, authorize('admin'), analyticsController.overview);
analyticsR.get('/today', authenticate, authorize('admin', 'staff'), analyticsController.todayStats);
analyticsR.get('/export/csv', authenticate, authorize('admin'), analyticsController.exportCSV);
analyticsR.get('/export/pdf', authenticate, authorize('admin'), analyticsController.exportPDF);
app.use('/api/analytics', analyticsR);

// ── REVIEWS ───────────────────────────────────────────────────────────────────
const reviewR = R();
reviewR.post('/', reviewController.create);
reviewR.get('/', authenticate, authorize('admin'), reviewController.getAll);
app.use('/api/reviews', reviewR);

app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 RestaurantOS API on port ${PORT} [${process.env.NODE_ENV}]`);
});
module.exports = server;
