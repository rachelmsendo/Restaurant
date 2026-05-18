// routes/auth.js
const express = require('express');
const { authController } = require('../controllers');
const { authenticate, authorize } = require('../middleware/auth');

const authRouter = express.Router();
authRouter.post('/login', authController.login);
authRouter.post('/register', authenticate, authorize('admin'), authController.register);
authRouter.get('/me', authenticate, authController.me);

// routes/menu.js
const menuRouter = express.Router();
const { menuController } = require('../controllers');
const { upload } = require('../config/cloudinary');

menuRouter.get('/', menuController.getFullMenu);
menuRouter.get('/items', menuController.getItems);
menuRouter.get('/items/:id', menuController.getItem);
menuRouter.post('/items', authenticate, authorize('admin'), upload.single('image'), menuController.createItem);
menuRouter.put('/items/:id', authenticate, authorize('admin'), upload.single('image'), menuController.updateItem);
menuRouter.delete('/items/:id', authenticate, authorize('admin'), menuController.deleteItem);

// routes/categories.js
const categoryRouter = express.Router();
const { categoryController } = require('../controllers');

categoryRouter.get('/', categoryController.getAll);
categoryRouter.post('/', authenticate, authorize('admin'), categoryController.create);
categoryRouter.put('/:id', authenticate, authorize('admin'), categoryController.update);
categoryRouter.delete('/:id', authenticate, authorize('admin'), categoryController.delete);

// routes/tables.js
const tableRouter = express.Router();
const { tableController } = require('../controllers');

tableRouter.get('/', authenticate, authorize('admin', 'staff'), tableController.getAll);
tableRouter.get('/:id', tableController.getOne);
tableRouter.post('/', authenticate, authorize('admin'), tableController.create);
tableRouter.put('/:id', authenticate, authorize('admin'), tableController.update);
tableRouter.delete('/:id', authenticate, authorize('admin'), tableController.delete);
tableRouter.post('/:id/regenerate-qr', authenticate, authorize('admin'), tableController.regenerateQR);

// routes/orders.js
const orderRouter = express.Router();
const { orderController } = require('../controllers');

orderRouter.post('/', orderController.create);
orderRouter.get('/', authenticate, authorize('admin', 'staff', 'kitchen'), orderController.getAll);
orderRouter.get('/table/:tableId', orderController.getByTable);
orderRouter.get('/:id', orderController.getOne);
orderRouter.put('/:id/status', authenticate, authorize('admin', 'staff', 'kitchen'), orderController.updateStatus);

// routes/payments.js
const paymentRouter = express.Router();
const { paymentController } = require('../controllers');

paymentRouter.post('/mobile/initiate', paymentController.initiateMobileMoney);
paymentRouter.post('/stripe/initiate', paymentController.initiateStripe);
paymentRouter.post('/webhook', paymentController.stripeWebhook);
paymentRouter.get('/:id/status', paymentController.checkStatus);

// routes/analytics.js
const analyticsRouter = express.Router();
const { analyticsController } = require('../controllers');

analyticsRouter.get('/revenue', authenticate, authorize('admin'), analyticsController.revenue);
analyticsRouter.get('/orders', authenticate, authorize('admin', 'staff'), analyticsController.orders);

module.exports = {
  authRoutes: authRouter,
  menuRoutes: menuRouter,
  categoryRoutes: categoryRouter,
  tableRoutes: tableRouter,
  orderRoutes: orderRouter,
  paymentRoutes: paymentRouter,
  analyticsRoutes: analyticsRouter,
};
