var express = require('express');
var router = express.Router();
const usercontroller = require('../controller/usercontroller');
const userSession=  require('../middleware/usermiddleware')


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

router.get('/userhome',usercontroller.gethome);
router.get ('/profile',userSession ,usercontroller.getprofile)

router.get ('/profile/changepassword',userSession , usercontroller.getChangePassProfile)
router.post('/change-password',userSession , usercontroller.postProfileChangePass)
router.post ('/profile/edit-profile' ,userSession , usercontroller.editBasicProfile)
router.post ('/profile/addaddress',userSession , usercontroller.postAddAddress)
router.post ('/profile/editaddress',userSession , usercontroller.postEditAddress)
router.delete ('/profile/delete/:addressID',userSession , usercontroller.deleteUserAddress)
router.get('/wallet',userSession , usercontroller.getWalletTRans)
router.get('/cart',userSession , usercontroller.getCart)
router.put('/cart/update/:productId',userSession , usercontroller.updateCartItem);
router.delete('/cart/remove/:productId',userSession , usercontroller.deleteItemsCart)
router.post ('/cart',userSession , usercontroller.addToCart)
router.post ('/cart/add',userSession , usercontroller.addtoCartProductpage)
router.post('/cart/apply_coupon',userSession , usercontroller.postApplyCoupon)
router.post ('/cart/addaddress',userSession , usercontroller.postAddressCart)

router.post ('/wishlist/add/:productId',userSession , usercontroller.addToWishlistIndividual)

router.get ('/orders',userSession , usercontroller.getOrders)
router.get('/orders/details/:orderId',userSession , usercontroller.getOrderDetails)
router.post ('/orders/cancel/:orderId',userSession , usercontroller.cancelOrder)
router.post('/orders/return/:orderId',userSession, usercontroller.returnOrder)

router.get ('/wishlist',userSession, usercontroller.getWishlist)
router.delete ('/wishlist/remove/:productId',userSession, usercontroller.deleteItemsfromWishlist)
router.get('/products', usercontroller.getProducts)
router.get('/products/filter', usercontroller.applyFilter)
router.post('/products/search', usercontroller.postSearchfilter)
router.get('/category/:categoryId', usercontroller.getCategoryFilter) 

router.get('/product/:productId', usercontroller.getIndividualProduct)

router.get('/cart/placeorder',userSession, usercontroller.getPlaceOrder)
router.post('/cart/placeorder/submit',userSession, usercontroller.postFinalOrderPlacing)
router.post('/orderOnline',userSession,usercontroller.postOnlinePurchase)
router.get('/afterorder',userSession, usercontroller.getAfterCheckout)






router.post('/logout', usercontroller.postLogoutUserHome)


module.exports = router;
