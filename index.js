const express = require('express');
const app = express();

// Simulated database
const db = {
    users: [{ id: 1, name: 'John Doe', balance: 1000 }],
    products: [
        { id: 1, name: 'Kurta', price: 50, stock: 10 },
        { id: 2, name: 'Jeans', price: 70, stock: 5 },
    ],
    orders: []
};

// Utility function for simulating async operations
const simulateDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Validate user
function validateUser(userId) {
    return new Promise((resolve, reject) => {
        simulateDelay(500).then(() => {
            const user = db.users.find(u => u.id === userId);
            if (user) {
                resolve(user);
            } else {
                reject(new Error('User not found'));
            }
        });
    });
}

// Check product availability
function checkProductAvailability(productId, quantity) {
    return new Promise((resolve, reject) => {
        simulateDelay(700).then(() => {
            const product = db.products.find(p => p.id === productId);
            if (product && product.stock >= quantity) {
                resolve(product);
            } else {
                reject(new Error('Product not available in requested quantity'));
            }
        });
    });
}

// Calculate total price
function calculateTotalPrice(products) {
    return products.reduce((total, p) => total + (p.price * p.quantity), 0);
}

// Process payment
function processPayment(userId, amount) {
    return new Promise((resolve, reject) => {
        simulateDelay(1000).then(() => {
            const user = db.users.find(u => u.id === userId);
            if (user.balance >= amount) {
                user.balance -= amount;
                resolve('Payment successful');
            } else {
                reject(new Error('Insufficient funds'));
            }
        });
    });
}

// Update inventory
function updateInventory(products) {
    return Promise.all(products.map(p => {
        return new Promise((resolve, reject) => {
            const dbProduct = db.products.find(dbP => dbP.id === p.id);
            if (dbProduct) {
                dbProduct.stock -= p.quantity;
                resolve();
            } else {
                reject(new Error(`Product ${p.id} not found`));
            }
        });
    }));
}

// Create order
function createOrder(userId, products) {
    return new Promise((resolve, reject) => {
        let user;
        validateUser(userId)
            .then(validUser => {
                user = validUser;
                return Promise.all(products.map(p => checkProductAvailability(p.id, p.quantity)));
            })
            .then(availableProducts => {
                const totalPrice = calculateTotalPrice(products);
                return processPayment(userId, totalPrice);
            })
            .then(() => updateInventory(products))
            .then(() => {
                const order = {
                    id: db.orders.length + 1,
                    userId: userId,
                    products: products,
                    status: 'completed'
                };
                db.orders.push(order);
                resolve(order);
            })
            .catch(error => {
                reject(error);
            });
    });
}

// Express route
app.get('/create-order', (req, res) => {
    const userId = 1; // In a real app, this would come from authentication
    const products = [
        { id: 1, quantity: 2 },
        { id: 2, quantity: 1 }
    ];

    createOrder(userId, products)
        .then(order => {
            res.json({ success: true, order: order });
        })
        .catch(error => {
            res.status(400).json({ success: false, error: error.message });
        });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));