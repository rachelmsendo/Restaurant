const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Customer joins their table's room
    socket.on('join_table', ({ tableId }) => {
      socket.join(`table:${tableId}`);
      console.log(`📍 Socket ${socket.id} joined table:${tableId}`);
    });

    // Kitchen staff joins the kitchen room
    socket.on('join_kitchen', () => {
      socket.join('kitchen');
      console.log(`👨‍🍳 Socket ${socket.id} joined kitchen`);
    });

    // Admin joins admin room
    socket.on('join_admin', () => {
      socket.join('admin');
      console.log(`👤 Socket ${socket.id} joined admin`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Emit a new order event to kitchen and admin
 */
const emitNewOrder = (order) => {
  if (!io) return;
  io.to('kitchen').emit('new_order', { order });
  io.to('admin').emit('new_order', { order });
  console.log(`📢 Emitted new_order: ${order.orderNumber}`);
};

/**
 * Emit order status update to relevant table, kitchen, and admin
 */
const emitOrderStatusUpdate = (order) => {
  if (!io) return;
  const payload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    tableId: order.table,
    estimatedReadyAt: order.estimatedReadyAt,
  };
  io.to(`table:${order.table}`).emit('order_status_updated', payload);
  io.to('kitchen').emit('order_status_updated', payload);
  io.to('admin').emit('order_status_updated', payload);
};

/**
 * Emit payment success to the customer's table
 */
const emitPaymentSuccess = (order, payment) => {
  if (!io) return;
  io.to(`table:${order.table}`).emit('payment_success', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    tableId: order.table,
    amount: payment.amount,
  });
  io.to('admin').emit('payment_success', {
    orderId: order._id,
    amount: payment.amount,
  });
};

const getIO = () => io;

module.exports = { initSocket, emitNewOrder, emitOrderStatusUpdate, emitPaymentSuccess, getIO };
