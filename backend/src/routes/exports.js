// These are thin wrappers that re-export from the main routes index
const {
  authRoutes,
  menuRoutes,
  categoryRoutes,
  tableRoutes,
  orderRoutes,
  paymentRoutes,
  analyticsRoutes,
} = require('./index');

module.exports = {
  auth: authRoutes,
  menu: menuRoutes,
  categories: categoryRoutes,
  tables: tableRoutes,
  orders: orderRoutes,
  payments: paymentRoutes,
  analytics: analyticsRoutes,
};
