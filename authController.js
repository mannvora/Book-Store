const bodyParser = require("body-parser");
const User = require("../models/User");
const Product = require("../models/ProductModel");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const passport = require("passport");
require("../routes/auth");
const Cart = require("../models/Cart");
const uuid = require("uuid").v4;
const stripe = require("stripe")(
  "stripe_id"
);

let jsonParser = bodyParser.json();
let urlencodedParser = bodyParser.urlencoded({ extended: false });

const handleErrors = (err) => {
  console.log(err.message, err.code);
  let errors = { email: "", password: "" };

  // incorrect email
  if (err.message === "Incorrect Email!!") {
    errors.email = "That email is not registered";
  }

  // incorrect password
  if (err.message === "Incorrect Password!!") {
    errors.password = "That password is incorrect";
  }

  // duplicate email error
  if (err.code === 11000) {
    errors.email = "that email is already registered";
    return errors;
  }

  // validation errors
  if (err.message.includes("product validation failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }

  return errors;
};

// create json web token
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
  return jwt.sign({ id }, "mann vora secret", {
    expiresIn: maxAge,
  });
};

module.exports.home = (req, res) => {
  res.render("home");
};

module.exports.about = (req, res) => {
  res.render("about");
};

module.exports.signup_get = (req, res) => {
  res.render("signup");
};

module.exports.login_get = (req, res) => {
  res.render("login");
};

module.exports.signup_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const product = await User.create({ email, password });
    const token = createToken(product._id);
    console.log(token);
    res.header("auth-token", token);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });

    res.status(201).json({ product: product._id, token: token, status: "ok" });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(200).json({ errors, status: "" });
  }
};

module.exports.isloggedin_get = (req, res) => {
  res.json({ msg: "HEY", data: "HEY REQUEST RECIEVED!!" });
};

module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;
  try {
    const product = await User.login(email, password);
    const token = createToken(product._id);
    // res.header('auth-token',token);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    let errors = { email: "", password: "" };
    res.status(200).json({ product: product._id, token });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(200).json({ errors, product: "" });
  }
};

module.exports.logout_get = (req, res) => {
  const cookie = req.body.token;
  res.cookie("jwt", "", { maxAge: 1 });
  res.status(200).json({ msg: "JWT DELETE REQUEST RECIEVED!!" });
};

module.exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.redirect("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

module.exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((product) => {
        if (!product) {
          req.flash("Error, NO Account with that Email found.");
          return res.redirect("/reset");
        }
        product.resetToken = token;
        product.resetTokenExpiration = Date.now() + 3600000;
        return product.save();
      })
      .then((result) => {
        res.redirect("/");
        transporter.sendEmail({
          to: req.body.email,
          from: "tatvasoft.com",
          subject: "Password Reset",
          html: ` 
              <p> YOU REQUESTED A PASSWORD RESET. USE THE LINK BELOW TO CHANGE YOUR PASSWORD. </p>
              <a href = "http://localhost:3000/reset/${token}">LINK</a> 
             `,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

module.exports.getProducts = (req, res) => {
  Product.find()
    .then((response) => res.send(response))
    .catch((err) => res.send(err));
};

module.exports.addProduct = async (req, res) => {
  const { productName, imageUrl, price, description, userId } = req.body;

  try {
    const product = await Product.create({
      name: productName,
      description: description,
      imageUrl: imageUrl,
      price: price,
      userId: userId,
    });
    res.status(201).json({ product: product._id, status: "ok" });
  } catch (err) {
    res.status(400).json({ err });
  }
};

module.exports.getCartData = async (req, res) => {
  const userId = req.body.userId;
  let prods = [];
  console.log(userId);
  let cart = await Cart.findOne({ userId });
  //console.log(cart.products, typeof(cart.products));
  if (cart) {
    prods = cart.products;
  } else {
    const newCart = await Cart.create({
      userId,
      products: [],
    });
    prods = newCart.products;
  }
  res.send(prods);
};

module.exports.deleteCartData = async (req, res) => {
  let productId = req.body.productId;

  if (req.body.productId) productId = req.body.productId;
  else productId = req.body._id;

  const userId = req.body.userId;

  console.log(productId, userId);

  let cart = await Cart.findOne({ userId });

  let itemIndex = cart.products.findIndex((p) => p.productId == productId);

  console.log(itemIndex);

  if (itemIndex > -1) {
    cart.products.splice(itemIndex, 1);
  }

  await cart.save();

  res.send("Product Deleted Successfully!");
};

module.exports.setCartData = async (req, res) => {
  const { productId, name, price, imageUrl } = req.body;
  // console.log(req.body);

  const userId = req.body.userId;

  try {
    let cart = await Cart.findOne({ userId });

    if (cart) {
      //cart exists for user
      let itemIndex = cart.products.findIndex((p) => p.productId == productId);
      if (itemIndex > -1) {
        let productItem = cart.products[itemIndex];
        const quantity = 1;
        const val = productItem.quantity + quantity;
        productItem.quantity = val;
        cart.products[itemIndex] = productItem;
      } else {
        //product does not exists in cart, add new item
        const quantity = 1;
        cart.products.push({ productId, quantity, name, price, imageUrl });
      }
      cart = await cart.save();
      return res.status(201).send(cart.products);
    } else {
      //no cart for user, create new cart
      console.log("NOT FOUND!!");
      const quantity = 1;
      const newCart = await Cart.create({
        userId,
        products: [{ productId, quantity, name, price, imageUrl }],
      });

      return res.status(201).send(newCart);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Something went wrong");
  }
};

module.exports.clearCart = async (req, res) => {
  const userId = req.body.userId;

  try {
    let cart = await Cart.findOne({ userId });
    cart.products = [];
    await cart.save();
    res.send("Cart Cleared Successfully!!");
  } catch (err) {
    console.log(err);
    res.send("Something Went Wrong!!");
  }
};

module.exports.getGoogleLogin = (req, res) => {
  passport.authenticate("google", { scope: ["email", "profile"] });
  res.send("SUCCESSFULLY AUTHENTICATED");
};

module.exports.stripePayment = async (req, res) => {
  const cost = req.body.cost;
  const userId = req.body.userId;

  const user = await User.findOne({ userId });
  console.log(user);
  const idempotencykey = uuid();

  return stripe.customers
    .create({
      email: user.email,
      id: userId,
    })
    .then((customer) => {
      stripe.charges.create(
        {
          amount: cost * 100,
          currency: "usd",
          customer: customer.id,
          receipt_email: user.email,
          shipping: {
            name: card.token.name,
            address: {
              country: token.card.address_country,
            },
          },
        },
        { idempotencykey }
      );
    })
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((err) => console.log(err));
};

module.exports.paymentHandler = async (req, res) => {
  console.log("HELLO THERE");

  let error, status;

  try {
    const { token, total } = req.body;
    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });

    const idempotency_key = uuid();
    const charge = await stripe.paymentIntents.create(
      {
        amount: total * 100,
        currency: "usd",
        customer: customer.id,
        receipt_email: token.email,
        description: `Purchased the product`,
        shipping: {
          name: token.card.name,
          address: {
            line1: token.card.address_line1,
            line2: token.card.address_line2,
            city: token.card.address_city,
            country: token.card.address_country,
            postal_code: token.card.address_zip,
          },
        },
      },
      {
        idempotency_key,
      }
    );
    console.log("Charge:", { charge });
    status = "success";
    res.status(200).send("success");
  } catch (err) {
    console.log("Error:", err);
    status = "failure";
    res.status(400).send("failure");
  }
};
