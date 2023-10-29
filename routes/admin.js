const express = require('express');
const adminController = require('../controller/admincontroller');
const multer = require ('multer')
const Product = require('../model/productmodel');
const requireAdminAuth = require ('../middleware/sessionmiddleware')
const router = express.Router()




router.get('/login', adminController.getAdminlogin)
router.post('/login', adminController.postAdminLogin)

router.use(requireAdminAuth)


router.get('/dash', adminController.getAdminDash)
router.get('/user', adminController.getUserList)

router.post('/toggle-block/:userId', adminController.toggleBlockStatus);



router.get('/category', adminController.getCategoryList)
router.post('/category', adminController.postAddCategory)

router.get('/editcategory/:categoryId', adminController.getEditCategory);
router.post('/updatecategory/:categoryId', adminController.updateCategory);

router.post('/toggle-list/:categoryId', adminController.toggleListStatus);

router.get('/product', adminController.getProduct)

router.get('/product/addproduct', adminController.getAddProduct)
router.post('/product/addproduct', adminController.postAddProduct);


router.post('/toggle-product/:productId', adminController.toggleProductStatus)
router.get('/editproduct/:productId', adminController.getEditProduct)

router.post ('/updateproduct/:productId', adminController.UpdateProduct)

router.get('/order', adminController.getTotalOrderList)
router.post ('/orders/update-status/:orderId', adminController.postStatusUpdate)
router.get('/order/details/:orderId', adminController.getCompleteOrderDetails)

router.get('/coupon', adminController.getCoupon)
router.post('/create-coupon', adminController.postCoupon)
router.delete ('/delete_coupon/:couponId', adminController.deleteCoupon)

router.get('/salesreport', adminController.getSalesReportPage)
router.get('/download-salesReport', adminController.downloadSalesReport);

router.get('/logout', adminController.adminLogout)

module.exports = router;