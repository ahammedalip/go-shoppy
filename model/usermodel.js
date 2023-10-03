const mongoose = require('mongoose')


const SignupSchema = new mongoose.Schema({
    firstName: {
        type: String,

    },
    lastName: {
        type: String,

    },
    email: {
        type: String,

        unique: true
    },
    mobile: {
        type: String,

    },
    password: {
        type: String,
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    cart: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId, // Reference to the product document
            ref: 'products' // Name of the related model
        },
        quantity: {
            type: Number,
            default: 1
        },
        total: {
            type: Number
        }
    }],
    wishlist: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products'
        }
    }],
    address: [{
        FullName: {
            type: String
        },
        ContactNo: {
            type: Number
        },
        BuildingName: {
            type: String
        },
        PostOffice: {
            type: String
        },
        place: {
            type: String
        },
        City: {
            type: String
        },
        State: {
            type: String
        },
        PIN: {
            type: Number
        },
        Country: {
            type: String
        }
    }],
    wallet:{
        type: Number,
        default: 0
    }
})

const userSignup = new mongoose.model("userSignupColllection", SignupSchema);

module.exports = userSignup;