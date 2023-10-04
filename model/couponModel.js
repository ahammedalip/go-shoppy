const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
    code: {
      type: String,
      required: true,
      unique: true,
    },
    discountPercent: {
      type: Number,
      required: true,
    },
    minimumPrice:{
      type:Number,
      required: true
    },
    maximumDiscount:{
      type: Number,
      required: true
    },
    expirationDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description:{
      type: String
    }
  });
  
  const coupon = mongoose.model('Coupon', couponSchema);
  
  module.exports = coupon;