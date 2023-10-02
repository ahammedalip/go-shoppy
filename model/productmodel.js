const mongoose = require('mongoose');



const productSchema = new mongoose.Schema({
    productName:{
        type: String,
        required: true
    },
    purchaseRate:{
        type:String,
        required: true
    },
    category:{
        type:String,
        required: true
    },
    price:{
        type: Number,
        required: true
    },
    quantity:{
        type: Number,
        required: true
    },
    additionalInfo:{
        type : String,
        required: true
    },
    brand:{
        type:String,
        required: true
    },
    colour:{
        type: String,
        
    },
    images:[{
        type: String
    }],
    unlisted:{
        type:Boolean,
        default: false
    },
})

const productlist = new mongoose.model('products', productSchema);

module.exports = productlist;