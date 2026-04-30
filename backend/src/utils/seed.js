require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { User, Category, MenuItem, Table, Order, Payment } = require('../models');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurantOS');
    console.log('✅ MongoDB connected');

    await Promise.all([
      User.deleteMany({}), Category.deleteMany({}),
      MenuItem.deleteMany({}), Table.deleteMany({}),
      Order.deleteMany({}), Payment.deleteMany({}),
    ]);
    console.log('🧹 Cleared existing data');

    // ── Users ─────────────────────────────────────────────────────────────────
    await User.create([
      { name: 'Restaurant Admin', email: 'admin@restaurantos.com', password: 'Admin1234!', role: 'admin' },
      { name: 'Head Chef Amina', email: 'kitchen@restaurantos.com', password: 'Kitchen1234!', role: 'kitchen' },
      { name: 'Waiter Brian', email: 'staff@restaurantos.com', password: 'Staff1234!', role: 'staff' },
    ]);
    console.log('👤 Created 3 users');

    // ── Categories ────────────────────────────────────────────────────────────
    const cats = await Category.insertMany([
      { name: 'Starters', slug: 'starters', icon: '🥗', sortOrder: 1 },
      { name: 'Mains', slug: 'mains', icon: '🍛', sortOrder: 2 },
      { name: 'Grills', slug: 'grills', icon: '🔥', sortOrder: 3 },
      { name: 'Drinks', slug: 'drinks', icon: '🥤', sortOrder: 4 },
      { name: 'Desserts', slug: 'desserts', icon: '🍰', sortOrder: 5 },
    ]);
    const C = Object.fromEntries(cats.map(c => [c.slug, c._id]));
    console.log('📂 Created 5 categories');

    // ── Menu Items ─────────────────────────────────────────────────────────────
    const placeholderImg = (text, bg = 'f97316') => ({
      url: `https://placehold.co/800x600/${bg}/ffffff?text=${encodeURIComponent(text)}`,
      publicId: `seed_${text.replace(/\s+/g, '_').toLowerCase()}`,
      isCover: true,
    });

    const menuItems = await MenuItem.insertMany([
      // Starters
      { name: 'Samosa (3 pcs)', description: 'Golden crispy pastry filled with spiced minced beef and vegetables. Served with tamarind chutney.', price: 350, category: C.starters, images: [placeholderImg('Samosa','16a34a')], isVegetarian: true, isPopular: true, preparationTime: 10, allergens: ['gluten'], ingredients: ['pastry', 'beef', 'onion', 'spices'] },
      { name: 'Chicken Wings (6 pcs)', description: 'Spicy marinated wings grilled to perfection. Served with peri-peri dip and coleslaw.', price: 650, category: C.starters, images: [placeholderImg('Wings','dc2626')], isPopular: true, preparationTime: 18 },
      { name: 'Soup of the Day', description: 'Chef\'s freshly made seasonal soup. Ask your waiter for today\'s special.', price: 400, category: C.starters, images: [placeholderImg('Soup','ea580c')], preparationTime: 10 },
      // Mains
      { name: 'Nyama Choma (500g)', description: 'Traditional Kenyan charcoal-grilled beef ribs, marinated in aromatic spices. Served with ugali and kachumbari.', price: 1200, category: C.mains, images: [placeholderImg('Nyama+Choma','92400e')], isPopular: true, preparationTime: 35, totalOrders: 142 },
      { name: 'Chicken Tikka Masala', description: 'Tender chicken in a rich, creamy tomato-based curry. Served with fragrant basmati rice and naan.', price: 950, category: C.mains, images: [placeholderImg('Tikka+Masala','c2410c')], preparationTime: 25, totalOrders: 98 },
      { name: 'Veggie Biryani', description: 'Fragrant basmati rice cooked with seasonal vegetables, saffron and whole spices. Served with cucumber raita.', price: 700, category: C.mains, images: [placeholderImg('Biryani','65a30d')], isVegetarian: true, isVegan: true, preparationTime: 20 },
      { name: 'Angus Beef Burger', description: '200g Angus beef patty with aged cheddar, caramelised onion, lettuce, tomato in a toasted brioche bun. Served with fries.', price: 850, category: C.mains, images: [placeholderImg('Burger','b45309')], isPopular: true, preparationTime: 15, totalOrders: 211 },
      // Grills
      { name: 'T-Bone Steak (300g)', description: 'Dry-aged T-bone, grilled to your preference. Served with garlic butter, roasted vegetables and fries.', price: 2200, category: C.grills, images: [placeholderImg('T-Bone','991b1b')], preparationTime: 30 },
      { name: 'Grilled Tilapia', description: 'Whole fresh tilapia, marinated in lemon and herbs, grilled over charcoal. Served with chips and coleslaw.', price: 1100, category: C.grills, images: [placeholderImg('Tilapia','0369a1')], preparationTime: 25 },
      // Drinks
      { name: 'Fresh Juice', description: 'Freshly pressed juice — choose from mango, passion, orange, watermelon or mixed tropical.', price: 250, category: C.drinks, images: [placeholderImg('Fresh+Juice','16a34a')], isVegetarian: true, isVegan: true, preparationTime: 5 },
      { name: 'Soft Drink', description: 'Coca-Cola, Sprite, Fanta Orange, Stoney Tangawizi, or still/sparkling water. 300ml.', price: 120, category: C.drinks, images: [placeholderImg('Soft+Drink','1d4ed8')], preparationTime: 2 },
      { name: 'Dawa Cocktail', description: 'Kenya\'s signature cocktail — premium vodka, fresh lime juice, raw honey and crushed ginger over ice.', price: 600, category: C.drinks, images: [placeholderImg('Dawa','7c3aed')], preparationTime: 5, isPopular: true },
      // Desserts
      { name: 'Chocolate Lava Cake', description: 'Warm dark chocolate fondant with a molten centre. Served with 2 scoops of vanilla ice cream.', price: 500, category: C.desserts, images: [placeholderImg('Lava+Cake','831843')], preparationTime: 15 },
      { name: 'Mango Sorbet', description: 'Refreshing homemade mango sorbet, 3 scoops. Vegan and gluten-free.', price: 350, category: C.desserts, images: [placeholderImg('Sorbet','d97706')], isVegetarian: true, isVegan: true, isGlutenFree: true, preparationTime: 5 },
    ]);
    console.log(`🍽️  Created ${menuItems.length} menu items`);

    // Map for easy lookup
    const M = Object.fromEntries(menuItems.map(m => [m.name, m]));

    // ── Tables ────────────────────────────────────────────────────────────────
    const tableData = [];
    const sections = ['Main Hall', 'Main Hall', 'Main Hall', 'Main Hall', 'Terrace', 'Terrace', 'Terrace', 'Bar', 'VIP', 'VIP'];
    for (let i = 1; i <= 10; i++) {
      const table = new (require('../models').Table)({
        number: i, name: `Table ${i}`,
        capacity: [2,4,4,4,4,6,6,2,8,8][i-1],
        section: sections[i-1],
      });
      const menuUrl = `${FRONTEND_URL}/menu?table=${table._id}`;
      const qr = await QRCode.toDataURL(menuUrl, { width: 400, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
      table.qrCode = { url: menuUrl, imageData: qr };
      tableData.push(table);
    }
    await Promise.all(tableData.map(t => t.save()));
    console.log('🪑 Created 10 tables with QR codes');

    // ── Demo Orders ───────────────────────────────────────────────────────────
    const now = new Date();
    const hoursAgo = (h) => new Date(now - h * 3600000);

    const demoOrders = [
      {
        table: tableData[0]._id, tableNumber: 1,
        customerName: 'Wanjiru Kamau', customerPhone: '0712345678',
        items: [
          { menuItem: M['Nyama Choma (500g)']._id, name: 'Nyama Choma (500g)', price: 1200, quantity: 1, image: M['Nyama Choma (500g)'].images[0]?.url },
          { menuItem: M['Fresh Juice']._id, name: 'Fresh Juice', price: 250, quantity: 2, image: M['Fresh Juice'].images[0]?.url },
          { menuItem: M['Samosa (3 pcs)']._id, name: 'Samosa (3 pcs)', price: 350, quantity: 1, image: M['Samosa (3 pcs)'].images[0]?.url },
        ],
        status: 'delivered', paymentStatus: 'paid', paymentMethod: 'mpesa',
        createdAt: hoursAgo(2),
      },
      {
        table: tableData[1]._id, tableNumber: 2,
        customerName: 'John Otieno',
        items: [
          { menuItem: M['Angus Beef Burger']._id, name: 'Angus Beef Burger', price: 850, quantity: 2, image: M['Angus Beef Burger'].images[0]?.url },
          { menuItem: M['Soft Drink']._id, name: 'Soft Drink', price: 120, quantity: 2, image: M['Soft Drink'].images[0]?.url },
          { menuItem: M['Chocolate Lava Cake']._id, name: 'Chocolate Lava Cake', price: 500, quantity: 1, image: M['Chocolate Lava Cake'].images[0]?.url },
        ],
        status: 'preparing', paymentStatus: 'unpaid',
        createdAt: hoursAgo(0.4),
      },
      {
        table: tableData[2]._id, tableNumber: 3,
        customerName: 'Amara Osei',
        items: [
          { menuItem: M['Chicken Tikka Masala']._id, name: 'Chicken Tikka Masala', price: 950, quantity: 1, image: M['Chicken Tikka Masala'].images[0]?.url },
          { menuItem: M['Veggie Biryani']._id, name: 'Veggie Biryani', price: 700, quantity: 1, image: M['Veggie Biryani'].images[0]?.url },
          { menuItem: M['Dawa Cocktail']._id, name: 'Dawa Cocktail', price: 600, quantity: 2, image: M['Dawa Cocktail'].images[0]?.url },
        ],
        status: 'ready', paymentStatus: 'paid', paymentMethod: 'cash',
        createdAt: hoursAgo(0.6),
      },
      {
        table: tableData[3]._id, tableNumber: 4,
        customerName: 'Fatuma Hassan',
        items: [
          { menuItem: M['T-Bone Steak (300g)']._id, name: 'T-Bone Steak (300g)', price: 2200, quantity: 1, image: M['T-Bone Steak (300g)'].images[0]?.url },
          { menuItem: M['Chicken Wings (6 pcs)']._id, name: 'Chicken Wings (6 pcs)', price: 650, quantity: 1, image: M['Chicken Wings (6 pcs)'].images[0]?.url },
          { menuItem: M['Fresh Juice']._id, name: 'Fresh Juice', price: 250, quantity: 1, image: M['Fresh Juice'].images[0]?.url },
        ],
        status: 'pending', paymentStatus: 'unpaid',
        createdAt: hoursAgo(0.1),
      },
      {
        table: tableData[4]._id, tableNumber: 5,
        customerName: 'David Kimani',
        items: [
          { menuItem: M['Grilled Tilapia']._id, name: 'Grilled Tilapia', price: 1100, quantity: 2, image: M['Grilled Tilapia'].images[0]?.url },
          { menuItem: M['Soup of the Day']._id, name: 'Soup of the Day', price: 400, quantity: 2, image: M['Soup of the Day'].images[0]?.url },
          { menuItem: M['Mango Sorbet']._id, name: 'Mango Sorbet', price: 350, quantity: 2, image: M['Mango Sorbet'].images[0]?.url },
          { menuItem: M['Soft Drink']._id, name: 'Soft Drink', price: 120, quantity: 3, image: M['Soft Drink'].images[0]?.url },
        ],
        status: 'confirmed', paymentStatus: 'unpaid',
        createdAt: hoursAgo(0.25),
      },
    ];

    for (const od of demoOrders) {
      const subtotal = od.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const tax = Math.round(subtotal * 0.16);
      const total = subtotal + tax;
      const order = new (require('../models').Order)({
        ...od, subtotal, tax, total,
        statusHistory: [{ status: od.status, updatedAt: od.createdAt }],
      });
      // Manually set createdAt (override auto)
      await order.save();
      await (require('../models').Order).updateOne({ _id: order._id }, { $set: { createdAt: od.createdAt } });

      if (od.paymentStatus === 'paid') {
        await (require('../models').Payment).create({
          order: order._id, amount: total, currency: 'KES',
          method: od.paymentMethod || 'cash', status: 'completed',
          paidAt: od.createdAt,
        });
      }
    }
    console.log('🧾 Created 5 demo orders');

    console.log('\n✅ Database seeded successfully!');
    console.log('─'.repeat(45));
    console.log('Admin:   admin@restaurantos.com / Admin1234!');
    console.log('Kitchen: kitchen@restaurantos.com / Kitchen1234!');
    console.log('Staff:   staff@restaurantos.com / Staff1234!');
    console.log('─'.repeat(45));
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
