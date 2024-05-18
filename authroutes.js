//tatvasoft-ecommerce.com

const bodyParser = require('body-parser');
const { requireAuth, checkUser } = require('../middleware/authMiddleware');

const { Router } = require('express');
const authController = require('../controllers/authController');    
const verifyToken = require('../routes/verifyToken');

const router = Router();

let jsonParser = bodyParser.json();
let urlencodedParser = bodyParser.urlencoded({ extended: false });

router.get('/', authController.home);

router.get('/about', requireAuth, authController.about);

router.get('/signup', authController.signup_get);

router.post('/signup', authController.signup_post);

router.get('/isloggedin', authController.isloggedin_get);

router.get('/login', authController.login_get);

router.post('/login', urlencodedParser, authController.login_post);

router.get('/logout', authController.logout_get);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/fetchProducts', authController.getProducts);

router.post('/addProduct', verifyToken, authController.addProduct);

router.post('/getCart', verifyToken, authController.getCartData);

router.post('/cart', verifyToken, authController.setCartData);

router.post('/deleteProductFromCart', verifyToken, authController.deleteCartData);

router.post('/clearCart', verifyToken, authController.clearCart);

router.get('/auth/google', authController.getGoogleLogin);

router.post('/payment', verifyToken, authController.stripePayment);

router.post('/paymentCheckout', authController.paymentHandler);

module.exports = router;