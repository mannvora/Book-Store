const express = require('express');
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('winston');  // Assume we've configured this elsewhere

const app = express();

// Middleware
app.use(express.json());
app.use(helmet());  // Adds various HTTP headers for security
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100  // limit each IP to 100 requests per windowMs
}));

// Database connection (assume we're using a real database like MongoDB)
const db = require('./db');  // This would be your database connection module

// Models (assuming Mongoose for MongoDB)
const User = require('./models/User');
const Product = require('./models/Product');
const Order = require('./models/Order');

// Utility function for simulating async operations (remove in production)
const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Validate user
async function validateUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }
    return user;
}

// Check product availability
async function checkProductAvailability(productId, quantity) {
    const product = await Product.findById(productId);
    if (!product || product.stock < quantity) {
        throw new Error('Product not available in requested quantity');
    }
    return product;
}

// Calculate total price
function calculateTotalPrice(products) {
    return products.reduce((total, p) => total + (p.price * p.quantity), 0);
}

// Process payment (this would typically involve a payment gateway)
async function processPayment(user, amount) {
    if (user.balance < amount) {
        throw new Error('Insufficient funds');
    }
    user.balance -= amount;
    await user.save();
    return 'Payment successful';
}

// Update inventory
async function updateInventory(products) {
    await Promise.all(products.map(async p => {
        const product = await Product.findById(p.id);
        if (!product) {
            throw new Error(`Product ${p.id} not found`);
        }
        product.stock -= p.quantity;
        await product.save();
    }));
}

// Create order
async function createOrder(userId, products) {
    const session = await db.startSession();
    session.startTransaction();

    try {
        const user = await validateUser(userId);
        await Promise.all(products.map(p => checkProductAvailability(p.id, p.quantity)));
        const totalPrice = calculateTotalPrice(products);
        await processPayment(user, totalPrice);
        await updateInventory(products);

        const order = new Order({
            userId: userId,
            products: products,
            status: 'completed'
        });
        await order.save({ session });

        await session.commitTransaction();
        return order;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

// Express route
app.post('/create-order', [
    body('userId').isInt(),
    body('products').isArray(),
    body('products.*.id').isInt(),
    body('products.*.quantity').isInt({ min: 1 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, products } = req.body;

    try {
        const order = await createOrder(userId, products);
        res.json({ success: true, order: order });
    } catch (error) {
        logger.error('Order creation failed', { error: error.message, userId, products });
        res.status(400).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send('Something broke!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server')
    app.close(() => {
        logger.info('HTTP server closed')
    })
})