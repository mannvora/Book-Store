const mongoose = require('mongoose');
const User = require('./User');
const ProductModel = require('./ProductModel');

const CartSchema = new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      products: [
        {
          productId: 
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
          },
          quantity:{
            type: Number,
          },
          name:{
            type: String,
          },
          price:{
            type: Number,
          },
          imageUrl:{
            type: String,
          }
        }
      ],
      active: {
        type: Boolean,
        default: true
      },
      modifiedOn: {
        type: Date,
        default: Date.now
      }
    },
    { timestamps: true }
  );

  const Cart = mongoose.model("Cart", CartSchema);

  module.exports = Cart;