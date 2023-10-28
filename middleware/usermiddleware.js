const userSignup = require('../model/usermodel')
const session = require('express-session');



const userAuth = async (req, res, next) =>{
    if(!req.session.email){
        res.render('../views/user_views/userlogin',{user:false, errorMessage:false})
    }else{
        const user = await userSignup.findOne({email: req.session.email})
        console.log('user', user)
        next();
    }
}

module.exports = userAuth;