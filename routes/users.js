var express = require('express');
var router = express.Router();
const usercontroller = require('../controller/usercontroller');


router.get('/', usercontroller.getGuestHome)

router.get('/login', usercontroller.getLoginpage)
router.post('/login', usercontroller.postLoginPage)


router.get('/signup', usercontroller.getSignupPage)
router.post('/signup', usercontroller.PostSignup)

router.get('/verify_otp', usercontroller.getOtpPage)
router.post('/verify_otp', usercontroller.postOtpPage)

router.get('/resetpassword', usercontroller.getresetPassword)
router.post('/resetpassword', usercontroller.postSendOtp)
router.get('/otpverify',usercontroller.getVerifyOTP )
router.post('/otpverify',usercontroller.postVerifyOTP)
router.get('/resubmitpassword',usercontroller.getSubmitPass)
router.post('/resubmitpassword', usercontroller.postSubmitPass)

router.get('/userhome',usercontroller.gethome)
router.get ('/profile', usercontroller.getprofile)
router.get ('/profile/changepassword', usercontroller.getChangePassProfile)
router.post('/change-password', usercontroller.postProfileChangePass)
router.post ('/profile/edit-profile', usercontroller.editBasicProfile)
router.post ('/profile/addaddress', usercontroller.postAddAddress)
router.post ('/profile/editaddress', usercontroller.postEditAddress)
router.delete ('/profile/delete/:addressID', usercontroller.deleteUserAddress)

router.get('/cart', usercontroller.getCart)
router.put('/cart/update/:productId', usercontroller.updateCartItem);
router.delete('/cart/remove/:productId', usercontroller.deleteItemsCart)
router.post ('/cart', usercontroller.addToCart)
router.post ('/cart/add', usercontroller.addtoCartProductpage)

router.post ('/wishlist/add/:productId', usercontroller.addToWishlistIndividual)

router.get ('/orders', usercontroller.getOrders)
router.get('/orders/details/:orderId', usercontroller.getOrderDetails)
router.post ('/orders/cancel/:orderId', usercontroller.cancelOrder)

router.get ('/wishlist', usercontroller.getWishlist)
router.delete ('/wishlist/remove/:productId', usercontroller.deleteItemsfromWishlist)
router.get('/products', usercontroller.getProducts)
router.get('/products/filter', usercontroller.applyFilter)
router.get('/category/:categoryId', usercontroller.getCategoryFilter) 

router.get('/product/:productId', usercontroller.getIndividualProduct)

router.get('/cart/placeorder', usercontroller.getPlaceOrder)
router.post('/cart/placeorder/submit', usercontroller.postFinalOrderPlacing)






router.post('/logout', usercontroller.postLogoutUserHome)




module.exports = router;
