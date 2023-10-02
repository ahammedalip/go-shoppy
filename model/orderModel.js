const mongoose = require('mongoose')

    const purchaseSchema = new mongoose.Schema({
        userId:{
            type: mongoose.Schema.Types.ObjectId,
            ref:'userSignupColllection'
        },
        products:[{
            productId:{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'products'
            },
            quantity: {
                type: Number
            },
        }],
        address:{
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
        },
       
        totalprice:{
            type: Number
        },
        orderDate:{
            type:Date,
            default: Date.now
        },
        orderStatus:{
            type: String,
        },
        paymentMethod:{
            type: String,

        },
        returned:{
            type: Boolean,
            default: false
        }
    })

    const order = new mongoose.model("Orders", purchaseSchema)

    module.exports = order;