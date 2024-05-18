const mongoose = require('mongoose');
const { isEmail } = require('validator');
const bcrypt = require('bcrypt');
const Cart = require('./Cart');

const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "Please Enter an Email!"],
        unique: true,
        lowercase: true,
        validate: [isEmail, 'Please Enter a Valid Email']
    },
    password: {
        type: String,
        required: [true, "Please Enter an Password!"],
        minlength: [6, "Password Length too short"]
    }
});

//static method to login user
userSchema.statics.login = async function(email, password) {
    const user = await this.findOne({ email });
    if(user) {
        const auth = await bcrypt.compare(password, user.password);
        if(auth)
        {
            return user;
        }
        throw Error('Incorrect Password!!');
    }
    throw Error('Incorrect Email!!');
}

userSchema.pre('save', async function(next) {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('user', userSchema);

module.exports = User;

userSchema.statics.addToCart = function (product) {
    const cartProductIndex = this.cart.items.findIndex((cp) => {
      return cp.productId.toString() === product._id.toString();
    });
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];
  
    if (cartProductIndex >= 0) {
      newQuantity = this.cart.items[cartProductIndex].quantity + 1;
      updatedCartItems[cartProductIndex].quantity = newQuantity;
    } else {
      updatedCartItems.push({
        productId: product._id,
        quantity: newQuantity,
      });
    }
    const updatedCart = {
      items: updatedCartItems,
    };
    this.cart = updatedCart;
    return this.save();
  };
  
  userSchema.methods.removeFromCart = function (productId) {
    const UpdatedCartItems = this.cart.items.filter((item) => {
      return item.productId.toString() !== productId.toString();
    });
    this.cart.items = UpdatedCartItems;
    return this.save();
  };
  
  userSchema.methods.clearCart = function () {
    this.cart = { items: [] };
    return this.save();
  };
