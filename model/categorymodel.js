const mongoose = require('mongoose')


const adminCategory = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true
    }, 
    isUnlisted:{
        type: Boolean,
        default:false
    }
})

const ProductCategory = new mongoose.model('productCategory', adminCategory)

module.exports = ProductCategory;