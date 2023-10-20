
const session = require('express-session');
const cookieParser = require('cookie-parser');


const multer = require('multer');
const path = require('path');
const fs = require('fs');


const adminSignup = require('../model/adminModel')
const ProductCategory = require('../model/categorymodel')
const Product = require('../model/productmodel');
const userModel = require('../model/usermodel')
const order = require('../model/orderModel');
const userSignup = require('../model/usermodel');
const coupon = require('../model/couponModel');




const adminController = {}



// Set up multer storage and options
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });



adminController.getAdminlogin = (req, res) => {

    try{
        if (req.session.adminId) {
            res.redirect('/admin/dash')
        }
        res.render('../views/admin_views/adminlogin',{message:false})

    }catch(error){
        console.log('Error at get admin login', error);
        res.status(500).send('Error')
    }

   
}

adminController.postAdminLogin = async (req, res) => {

    try {
        const adminverify = await adminSignup.findOne({ email: req.body.email })

        if (adminverify.password === req.body.password) {
            req.session.adminId = adminverify._id
            console.log(req.session.adminId);

            res.cookie('adminAuthenticated', true, { maxAge: 24 * 60 * 60 * 1000 }); // 24 hours in milliseconds
            res.redirect('/admin/dash')
        }else if(adminverify.password !== req.body.password){
            res.render('../views/admin_views/adminlogin', {message:"Password is wrong!"})
             
        }

    } catch (err) {
        console.log('error from saving data to schema', err);
        res.send('failed')
    }
}




// code for block and unblock with db update
adminController.toggleBlockStatus = async (req, res) => {
    try {
        const user = await userModel.findById(req.params.userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.redirect('/admin/user'); // Redirect back to the dashboard
    } catch (error) {
        console.error(error);
        res.status(500).send('Error toggling block status');
    }
};

adminController.getAdminDash = (req, res) => {
  
    res.render('../views/admin_views/admindash')

}

adminController.getUserList = async (req, res) => {
    try {
        const userList = await userModel.find(); // Fetch all users from the database
        res.render('../views/admin_views/userlist', { userList }); // Pass userList to the EJS template
    } catch (error) {
        console.error(error);
        res.send('Error fetching user list');
    }
};


adminController.getCategoryList = async (req, res) => {
    try {
        const categoryList = await ProductCategory.find(); // Fetch all categories from the database
        res.render('../views/admin_views/category', { categoryList, errorMessage: false }); // Pass categoryList to the EJS template
    } catch (error) {
        // console.error(error);
        res.send('Error fetching category list');
    }
};


adminController.postAddCategory = async (req, res) => {
    try {
        const { category } = req.body;

        // Create a regular expression to match the category name case-insensitively
        const categoryRegex = new RegExp(`^${category}$`, 'i');

        // Check if the category already exists in the database (case-insensitive check)
        const existingCategory = await ProductCategory.findOne({ categoryName: categoryRegex });

        if (existingCategory) {
            const categoryList = await ProductCategory.find();
            return res.render('../views/admin_views/category', { categoryList, errorMessage: 'Category already exists' });
        }

        const newCategory = new ProductCategory({ categoryName: category });

        // console.log(category);

        await newCategory.save()

        res.redirect('/admin/category')
    } catch (error) {
        console.log(error);
        res.send('An error occured while saving the category')
    }
}

// Display the edit page
adminController.getEditCategory = async (req, res) => {
    try {
        const category = await ProductCategory.findById(req.params.categoryId);
        res.render('../views/admin_views/editcategory', { category });
    } catch (error) {
        console.error(error);
        res.send('Error fetching category details');
    }
};

// Handle form submission to update the category
adminController.updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const newCategoryName = req.body.category;
        const existingCategory = await ProductCategory.findOne({ categoryName: newCategoryName });

        if (existingCategory) {
            const categoryList = await ProductCategory.find();
            return res.render('../views/admin_views/category', { categoryList, errorMessage: 'Category already exists' });
        }

        // Update the existing category name in the database
        const result = await ProductCategory.updateOne(
            { _id: categoryId },
            { $set: { categoryName: newCategoryName } }
        );


        res.redirect('/admin/category'); // Redirect back to the category list

        // No document was modified, category ID might not exist
        // res.status(404).send('Category not found');

    } catch (error) {
        console.error(error);
        res.send('Error updating category');
    }
};

adminController.toggleListStatus = async (req, res) => {
    try {
        // console.log('Toggle List Status called');

        const category = await ProductCategory.findById(req.params.categoryId);
        // console.log('Found category:', category);

        if (!category) {
            return res.status(404).send('Category not found');
        }

        category.isUnlisted = !category.isUnlisted;
        await category.save();
        // console.log('Category updated:', category);


        res.redirect('/admin/category'); // Redirect back to the category list
    } catch (error) {
        console.error(error);
        res.status(500).send('Error toggling list status');
    }
};

adminController.getProduct = async (req, res) => {
    try {
        const productList = await Product.find() // Populate the category field

        productList.forEach(product => {
            product.fullImages = product.images.map(image => '/uploads/' + image); // Update the path as per your image storage
        });

        res.render('../views/admin_views/product', { productList });
    } catch (error) {
        console.error(error);
        res.send('Error fetching product list');
    }
}



adminController.getAddProduct = async (req, res) => {
    try {
        const categoryList = await ProductCategory.find({ isUnlisted: false });
        res.render('../views/admin_views/addproduct.ejs', { categoryList });
    } catch (error) {
        console.error(error);
        res.send('Error fetching categories');
    }
}


adminController.postAddProduct = [
    
    upload.array('images', 4), // Apply the upload middleware here
    async (req, res) => {
        console.log('coming here');
        try {
            const { productName, purchaseRate, offer, category, price, quantity, additionalInfo, brand, colour } = req.body;
            const uploadedImages = req.files; // Access uploaded files using req.files

            // Fetch the category document using the provided categoryId
            const selectedCategory = await ProductCategory.findOne({ _id: category });
            console.log('offer', offer);
            let offerPrice;
            if(offer){
                 offerPrice =Math.floor(price - (price*(offer/100))) 
                console.log(offerPrice);
            }else{
                offerPrice=0
            }
            if (!selectedCategory) {
                return res.send('Selected category not found'); // Handle category not found case
            }

            // Create a new product using the model and form data
            const newProduct = new Product({
                productName,
                purchaseRate,
                category: selectedCategory.categoryName, // Use the categoryName from the selected category
                price,
                quantity,
                additionalInfo,
                brand,
                colour,
                offer,
                offerPrice,
                images: uploadedImages.map(image => image.filename) // Store filenames in the images array
            });

            // Save the product to the database
            await newProduct.save();

            res.redirect('/admin/product'); // Redirect after successful addition
        } catch (error) {
            console.error(error);
            res.send('An error occurred');
        }
    }
];



adminController.toggleProductStatus = async (req, res) => {

    try {
        const productStatus = await Product.findById(req.params.productId)

        if (!Product) {
            return res.status(404).send('Category not found');
        }

        productStatus.unlisted = !productStatus.unlisted
        await productStatus.save();
        res.redirect('/admin/product')
    } catch (error) {
        console.log(error);
        res.status(500).send('error toggling', error)
    }

};


adminController.getEditProduct = async (req, res) => {
    try {
        const editProduct = await Product.findById(req.params.productId);

        // Populate fullImages array with image URLs
        editProduct.fullImages = editProduct.images.map(image => '/uploads/' + image); // Update the path as per your image storage

        res.render('../views/admin_views/editproduct', { editProduct });
    } catch (err) {
        console.log(err);
        res.send('error fetching product details');
    }
};


adminController.UpdateProduct = async (req, res) => {
    try {
        const productId = req.params.productId;

        // console.log('prduct id from updateproduct',productId);

        const {
            productName,
            purchaseRate,
            price,
            quantity,
            colour,
            brand,
            offer,
            additionalInfo
        } = req.body;

        let offerPrice;
            if(offer){
                 offerPrice = Math.floor(price - (price*(offer/100)));
                console.log(offerPrice);
            }else{
                offerPrice = 0;
            }
       


        // Update the existing category name in the database
        const result = await Product.updateOne(
            { _id: productId },
            {
                $set: {
                    productName: productName,
                    purchaseRate: purchaseRate,
                    price: price,
                    quantity: quantity,
                    colour: colour,
                    brand: brand,
                    offer: offer,
                    offerPrice: offerPrice,
                    additionalInfo: additionalInfo
                }
            }
        );

        res.redirect('/admin/product');
    } catch (error) {
        console.log('error at updateProduct', error);
        res.send('Error updating product');
    }
};

adminController.getTotalOrderList = async (req, res) => {
    try {
        const orderList = await order.find().populate('userId').populate('products.productId')
        const user = await userModel.find()
        //    console.log('users', user);

        res.render('../views/admin_views/totalOrder', { orderList })
    }
    catch (error) {
        console.log('Error at get total orders list ');
        res.status(500).send('Error at getTotalOrderList')
    }

}

adminController.postStatusUpdate = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    console.log('status----------', req.body);
    try {
        const updatedOrder = await order.findByIdAndUpdate(orderId, { orderStatus: status }, { new: true });

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        async function returnPaymentToWallet(orderId) {
            try {
              const payuser = await order.findById(orderId).populate('userId');
              const currentWallet = payuser.userId.wallet;
              const returnToWallet = payuser.totalprice;
              const updateWallet = currentWallet + returnToWallet;
          
              await userSignup.findOneAndUpdate(
                { _id: payuser.userId },
                { $set: { wallet: updateWallet } }
              );
          
              // Log the updated wallet amount
              console.log('Updated Wallet Amount:', updateWallet);
            } catch (error) {
              console.error('Error returning payment to wallet:', error);
              throw error; // You can choose to rethrow the error or handle it as needed.
            }
          }

        if (updatedOrder.paymentMethod === 'WalletPay' && status === 'cancelled') {
            try {
                await returnPaymentToWallet(orderId)
               
            }
            catch (error) {
                console.log('Error at payment return in cancelling order at postStatusUpdate', error);
                res.send('Error at cancelling order')
            }
        }

        // Send a success response
        res.json({ message: 'Order status updated successfully', updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
}

adminController.getCompleteOrderDetails = async(req, res) =>{
    try{

        const orderId = req.params.orderId;
        // console.log('order id', orderId);

        const ordered = await order.findById(orderId).populate('products.productId')
        // console.log('complete order details', ordered);

        res.render('../views/admin_views/detailedOrderView',{ordered})
    }
    catch(error){
        console.log('Error at detailed order view', error);
        res.send('Error while fetching Order details')
    }
   
}


adminController.getCoupon = async(req, res) =>{

    
    const mess = req.query.message;
    if(mess){
        var message = 'Succesfully added coupon!';
    }
//    console.log('mess and message', mess,message);
try{
    const coupons = await coupon.find();

     // Get the current date
     const currentDate = new Date();

     // Update isActive based on expirationDate
     for (const couponItem of coupons) {
         if (couponItem.expirationDate < currentDate) {
             couponItem.isActive = false;
             await couponItem.save(); // Save the updated coupon
         }
     }

    res.render('../views/admin_views/coupon.ejs',{message, coupons})
}catch(error){
    console.log('error at coupons listing', error);
    res.send('Error')
}  
}

adminController.postCoupon = async (req, res) =>{
    try {
        // Extract data from the form submission
        const { code, discountPercent,minimumPrice, maximumDiscount, expirationDate,description, isActive } = req.body;

    
        const newCoupon = new coupon({
            code,
            discountPercent,
            minimumPrice,
            maximumDiscount,
            expirationDate,
            description,
            isActive: isActive === 'on',
        });

       
        await newCoupon.save();
       
        res.redirect('/admin/coupon?message=c-succes'); // Redirect to a page showing the list of coupons, adjust the route as needed
    } catch (error) {
        // Handle errors, e.g., show an error message to the user
        console.error('Error creating coupon:', error);
        res.status(500).send('Error creating coupon');
    }
}

adminController.deleteCoupon = async(req,res) => {
    try{
        const couponId =req.params.couponId
        console.log('coupon id ', couponId);

        await coupon.findByIdAndDelete(couponId)
        return res.json({succes: true})
    }
    catch(error){
        console.log('Error at deleting the coupon', error);
        res.send('Error at coupon delete')
    }
}



adminController.adminLogout = (req, res) => {
    const wasLoggedIn = !!req.session.adminId; // Check if user was logged in

    req.session.destroy(); // Destroy the session
    res.clearCookie('adminAuthenticated'); // Clear the cookie

    if (wasLoggedIn) {
        res.redirect('/admin/login'); // Redirect to login page if user was logged in
    } else {
        res.redirect('/admin/dash'); // Redirect to dashboard if user was not logged in
    }
};




module.exports = adminController