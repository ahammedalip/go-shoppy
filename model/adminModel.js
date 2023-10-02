const mongoose = require('mongoose')



const adminLoginSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }

})

const adminSignup = new mongoose.model("adminSignup", adminLoginSchema)


module.exports= adminSignup;
               