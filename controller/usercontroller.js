
// const express= req('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const userSignup = require('../model/usermodel')
const ProductCategory = require('../model/categorymodel')
const productList = require('../model/productmodel')
const order = require('../model/orderModel')
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt')
var Razorpay = require('razorpay')
const path = require('path');
const fs = require('fs');
const coupon = require('../model/couponModel');


const usercontroller = {}

usercontroller.getGuestHome = async (req, res) => {

    try {
        const categories = await ProductCategory.find({ isUnlisted: false })
        res.render('../views/user_views/userhome', { categories, user: false });
    }
    catch (error) {
        console.log(error);
    }

}

usercontroller.getLoginpage = (req, res) => {
    try {
        if (req.cookies.user) {
            res.render('../views/user_views/userhome')
        } else {
            res.render('../views/user_views/userlogin', { errorMessage: false, user: false })
        }

    } catch (error) {
        console.log('Error at get login page', error);
    }
}

usercontroller.postLogoutUserHome = (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log('error in destroying', err);
            } else {
                res.clearCookie('user')
                res.redirect('/')
            }
        })
    } catch (error) {
        console.log('Error at post logout', error);
        res.status.send('Error')
    }
};

usercontroller.postLoginPage = async (req, res) => {

    if (req.body.password.length < 5) {
        res.render('../views/user_views/userlogin', { errorMessage: 'Password should be minimum 5 characters' });
    }

    try {
        const userverify = await userSignup.findOne({ email: req.body.email })

        if (userverify.isBlocked) {
            return res.render('../views/user_views/userlogin', { errorMessage: 'User is blocked', user: userverify || false });
        }

        else if (userverify && bcrypt.compareSync(req.body.password, userverify.password)) {

            req.session.email = req.body.email

            const expirationDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

            res.cookie('user', req.body.email, { expires: expirationDate })

            // console.log('coming here');
            res.redirect('/userhome');
        }
        else {
            console.log('error');
            res.render('../views/user_views/userlogin', { errorMessage: 'Invalid email or password' });
        }
    }
    catch (error) {
        console.error(error);
        res.send('some error');
    }
}

usercontroller.getSignupPage = (req, res) => {
    try {
        if (req.cookies.user) {
            res.render('../views/user_views/userhome')
        }
        else {
            res.render('../views/user_views/usersignup', { errorMessage: false, user: false })
        }
    } catch (error) {
        console.log('Error at get signup page', error);
        res.status(500).send('Error ', error)
    }
}

usercontroller.PostSignup = async (req, res) => {

    const { firstName, lastName, email, mobile, password, referral } = req.body;
    const userSignupData = { firstName, lastName, email, mobile, password }
    const referralCode = referral
    console.log('referalcode from the text box', referralCode);
    try {

        // Check if the email already exists
        const existingUser = await userSignup.findOne({ email });
        if (mobile.length < 10 || mobile.length > 10) {
            return res.render('../views/user_views/usersignup', { errorMessage: 'mobile number should be 10 digits', user: false });
        }

        if (password.length < 5) {
            return res.render('../views/user_views/usersignup', { errorMessage: 'password should be atleast 5 characters', user: false })
        }

        if (existingUser) {
            // Email already exists, render the signup page with an error message
            return res.render('../views/user_views/usersignup', { errorMessage: 'Email already exists', user: false });
        }

        req.session.userSignupData = userSignupData;
        req.session.referralcode = referralCode;

        console.log(userSignupData);

        const transporter = nodemailer.createTransport({
            service: 'Gmail', // Use your email service provider
            auth: {
                user: 'ahmd.work12@gmail.com', // Your email
                pass: 'tsgqtxqxcfpvmrin'   // Your email password or an app-specific password
            }
        });

        // Generate a random OTP
        const generatedOTP = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
        req.session.otp = generatedOTP
        console.log(req.session.otp);

        const mailOptions = {
            from: 'ahmd.work12@gmail.com',
            to: req.body.email, // User's email
            subject: 'OTP Verification',
            text: `Your OTP for verification of Go Shoppy is : ${generatedOTP}. 
     Do not share the OTP with anyone.
     For further details and complaints visit info.goshoppy.com`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.redirect('/verify_otp')
    } catch (error) {
        console.log('Error at post signup', error);
        res.status(500).send('Error')
    }
}

usercontroller.getOtpPage = (req, res) => {
    if (req.cookies.user) {
        res.render('../views/user_views/userhome')
    }
    else {
        res.render('../views/user_views/userotp', { errorMessage: false, user: false })
    }
}

usercontroller.postOtpPage = async (req, res) => {
    const { otp } = req.body
    const userEnteredOtp = otp

    if (userEnteredOtp == req.session.otp) {

        // console.log('getting from the session', req.session.referralcode );
        const applyReferralCode = req.session.referralcode;
        // console.log('apply referals from req.session.referalcode',applyReferralCode);

        try {
            const newSignup = userSignup({
                firstName: req.session.userSignupData.firstName,
                lastName: req.session.userSignupData.lastName,
                email: req.session.userSignupData.email,
                mobile: req.session.userSignupData.mobile,
                password: bcrypt.hashSync(req.session.userSignupData.password, 2),

            })
            await newSignup.save()

            let referralOffer = 50;

            if (applyReferralCode) {
                try {
                    console.log('coming here');
                    await userSignup.findOneAndUpdate({ refferralcode: applyReferralCode },
                        { $inc: { wallet: referralOffer } })
                } catch (error) {
                    console.log('error at applying referral code', error);
                    res.send('Error at applying user referrals')
                }
            }

            req.session.destroy();
  
            res.render('../views/user_views/userlogin', { errorMessage: 'Signup succesfull, Use login', user: false })
        }
        catch (error) {
            console.log('error at post signup', error)
            res.status(401).send('Invalid OTP');
        }
    } else {
        res.render('../views/user_views/userotp', { errorMessage: 'Enter valid OTP', user: false })
    }
}


usercontroller.getresetPassword = (req, res) => {
    res.render('../views/user_views/resetpassword', { errorMessage: false, user: false })

}

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'ahmd.work12@gmail.com',
        pass: 'tsgqtxqxcfpvmrin'
    }
});

usercontroller.postSendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if the email exists in the database
        const existingUser = await userSignup.findOne({ email });

        if (!existingUser) {
            // Email does not exist in the database, render an error message
            return res.render('../views/user_views/resetpassword', { errorMessage: 'Email not found. Please enter a valid email.' });
        } else {
            req.session.email = existingUser.email
            console.log("from session", req.session.email);
        }

        // Generate a random OTP
        const generatedOTP = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
        req.session.otp = generatedOTP;
        console.log("otp is ", req.session.otp);

        const mailOptions = {
            from: 'ahmd.work12@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${generatedOTP}. 
      Do not share the OTP with anyone.`

        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                res.render('../views/user_views/resetpassword', { errorMessage: 'Error sending OTP. Please try again.' });
            } else {
                console.log('Email sent to: ' + req.body.email + info.response);
                res.redirect('/otpverify'); // Redirect to OTP verification page
            }
        });
    } catch (error) {
        console.error(error);
        res.render('../views/user_views/forgotpassword', { errorMessage: 'An error occurred. Please try again.' });
    }
};

usercontroller.getVerifyOTP = (req, res) => {

    res.render('../views/user_views/resetotp', { errorMessage: false, user: false })

}

usercontroller.postVerifyOTP = (req, res) => {
    const userEnteredOTP = req.body.otp; // OTP entered by the user
    const sessionOTP = req.session.otp; // OTP stored in the session

    if (userEnteredOTP == sessionOTP) {
        // OTP is correct, proceed to the password reset page
        res.redirect('/resubmitpassword');
    } else {
        // OTP is incorrect, render an error message
        res.render('../views/user_views/userotp', { errorMessage: 'Invalid OTP. Please try again.' });

    }
};

usercontroller.getSubmitPass = (req, res) => {

    res.render('../views/user_views/newpassword', { errorMessage: false, user: false })

}

usercontroller.postSubmitPass = async (req, res) => {
    const { newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.render('../views/user_views/newpassword', { errorMessage: 'Passwords do not match' });
    }

    try {
        // Find the user by email and update the password
        const user = await userSignup.findOneAndUpdate(
            { email: req.session.email }, // Use the appropriate field to identify the user
            { password: bcrypt.hashSync(newPassword, 2) } // Hash the new password
        );

        if (!user) {
            return res.render('../views/user_views/newpassword', { errorMessage: 'User not found' });
        }

        // Password updated successfully, clear the session and redirect to login
        req.session.destroy();
        res.render('../views/user_views/userlogin', { errorMessage: 'Password changed succesfully, please login' }); // Change this to the appropriate login route
    } catch (error) {
        console.error(error);
        res.render('../views/user_views/newpassword', { errorMessage: 'An error occurred. Please try again.' });
    }
};

usercontroller.gethome = async (req, res) => {

    if (req.cookies.user) {

        try {
            const user = await userSignup.findOne({ email: req.cookies.user })
            const categories = await ProductCategory.find({ isUnlisted: false })
            console.log('user cart', user);
            const userCart = user.cart

            res.render('../views/user_views/userhome', { categories, user });
        }
        catch (error) {
            console.log('error fetching categories', error);
            res.send('error fetching category')
        }
    } else {
        res.redirect('/')
    }
};

usercontroller.getProducts = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user })
        const categories = await ProductCategory.find({ isUnlisted: false });
        const productsPerPage = 6; // Define the number of products per page

        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;

        const products = await productList.find({ unlisted: false }).skip(startIndex).limit(productsPerPage);

        const totalProducts = await productList.countDocuments({ unlisted: false });
        const totalPages = Math.ceil(totalProducts / productsPerPage);

        res.render('../views/user_views/products', { categories, products, currentPage, totalPages, user });
    } catch (error) {
        console.log('error in product page', error);
        res.send('error in product list');
    }
};

usercontroller.getCategoryFilter = async (req, res) => {
    const categoryId = req.params.categoryId;

    try {
        const user = await userSignup.findOne({ email: req.cookies.user });
        const categories = await ProductCategory.find({ isUnlisted: false });
        const cat = await ProductCategory.findById(categoryId);
        const productsPerPage = 6; // Define the number of products per page

        // Get the current page number from the query parameter or default to 1
        const currentPage = parseInt(req.query.page) || 1;

        // Calculate the starting index and ending index for the products to display on the current page
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;

        const products = await productList.find({ category: cat.categoryName, unlisted: false })
            .skip(startIndex)
            .limit(productsPerPage);

        // Calculate the total number of pages based on the total number of products
        const totalProducts = await productList.countDocuments({ category: cat.categoryName, unlisted: false });
        const totalPages = Math.ceil(totalProducts / productsPerPage);

        res.render('../views/user_views/products', { categories, products, currentPage, totalPages, user });
    } catch (error) {
        console.log('Error in category filter page', error);
        res.send('Error in category filter product list');
    }
};


usercontroller.getIndividualProduct = async (req, res) => {


    try {
        const user = await userSignup.findOne({ email: req.cookies.user });
        const productId = req.params.productId;
        const categories = await ProductCategory.find({ isUnlisted: false })
        const individualProduct = await productList.findOne({ _id: productId })
        // console.log(individualProduct.offer);
        let offerPrice;
        if (individualProduct.offer) {
            const price = individualProduct.price;
            const discount = price * (individualProduct.offer / 100)
            offerPrice = Math.floor(price - discount)
            console.log('offer price', offerPrice);
        }
        res.render('../views/user_views/individualproduct', { categories, individualProduct, user, offerPrice })
    }
    catch (error) {
        console.log('Error at individual product page:_________________________', error);
        res.send('Error at individual page')
    }

}

usercontroller.applyFilter = async (req, res) => {
    const min = req.query.min;
    const max = req.query.max;
    const above = req.query.above;

    console.log('min price & max.price', min, max, above);

    try {
        
        const user= await userSignup.findOne({email:req.cookies.user})
        const categories = await ProductCategory.find({ isUnlisted: false });

        const productsPerPage = 6; // Define the number of products per page
        const currentPage = parseInt(req.query.page) || 1;
        const startIndex = (currentPage - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        let filteredProducts;
        let totalProductsFromFilter;
        if(above){
            filteredProducts = await productList.find({unlisted:false,
                price:{$gte:parseInt(above)}}).skip(startIndex).limit(productsPerPage);

                totalProductsFromFilter = await productList.find({unlisted:false,
                    price:{$gte:parseInt(above)}});

            }else{
                filteredProducts = await productList.find({unlisted:false,
                    price:{
                        $gte:parseInt(min),
                        $lte:parseInt(max)
                    }
                    }).skip(startIndex).limit(productsPerPage);

                    totalProductsFromFilter = await productList.find({unlisted:false,
                        price:{
                            $gte:parseInt(min),
                            $lte:parseInt(max)
                        }
                        });
            }

        const totalPages = Math.ceil(totalProductsFromFilter / productsPerPage);

        res.render('../views/user_views/products', { products: filteredProducts, user, categories, currentPage, totalPages });
    } catch (err) {
        console.error("Error filtering products:", err);
        res.status(500).send("Internal server error" );
    }
}

usercontroller.getCart = async (req, res) => {
    if (req.cookies.user) {

        try {
            const user = await userSignup.findOne({ email: req.cookies.user })
                .populate({
                    path: 'cart.productId',
                    model: 'products' // This should match the model name of your Product
                });


            const availableCoupons = await coupon.find({ isActive: true })
            user.cart.forEach(item => {
                const offer = item.productId.offerPrice

  
                if (offer) {
      
                    item.total = offer * item.quantity;

                }
            })
  

            const cartProducts = user.cart;
            let totalQuantity = 0;

            user.cart.forEach(item => {
                totalQuantity += item.quantity;
            });

            let wholeTotal = 0

            user.cart.forEach(item => {
                wholeTotal += item.total;
            })

            req.session.userEmail = user.email
            req.session.totalPrice = wholeTotal


            const grandTotal = wholeTotal;

            req.session.grandTotal = wholeTotal;

            res.render('../views/user_views/cart', { cartProducts, totalQuantity, wholeTotal, grandTotal, availableCoupons, user });
        } catch (error) {
            console.log('error at get cart', error);
            res.send('Error fetching cart');
        }
    } else {
        return res.redirect('/login')
    }
}

usercontroller.updateCartItem = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        console.log('product id ', productId);
        console.log('quantity', quantity);

        // Find the user and log the entire user object for inspection
        const user = await userSignup.findOne({ email: req.cookies.user }).populate('cart.productId');
        user.cart.forEach(item => {

            console.log('offer directly offer, offerprice', item.productId.offer, item.productId.offerPrice)
        })

        if (user) {
            // Attempt to find the cart item to update
            const cartItem = user.cart.find(item => item._id.toString() === productId.toString()); // Ensure both are converted to strings
            // console.log('Cart Item:', cartItem);


            if (cartItem) {
                // Update the quantity for the cart item
                cartItem.quantity = quantity;

                console.log('product offer find', cartItem.productId.offer);

                if (cartItem.productId.offer) {
                    cartItem.total = cartItem.quantity * cartItem.productId.offerPrice
                    await user.save();
                } else {
                    cartItem.total = cartItem.quantity * cartItem.productId.price;
                    await user.save();
                }





                let totalQuantity = 0
                user.cart.forEach(item => {
                    totalQuantity += item.quantity;
                })

                let wholeTotal = 0;
                let totalIncDiscount = 0;
                const disc = req.session.discountedTotal;
                console.log('disc from dom loading', disc);

                user.cart.forEach(item => {
                    wholeTotal += item.total
                    totalIncDiscount = wholeTotal - disc
                })
                console.log('grand total after discount', totalIncDiscount);
                req.session.totalPrice = wholeTotal

                res.json({ success: true, totalPrice: cartItem.total, wholeTotal: wholeTotal, totalQuantity: totalQuantity });
            } else {
                res.json({ success: false, message: 'Cart item not found' });
            }
        } else {
            res.json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'An error occurred while updating the cart item' });
    }
};

usercontroller.deleteItemsCart = async (req, res) => {

    try {
        const { productId } = req.params
        console.log('product id from the ejs file', productId);
        const searchUser = await userSignup.findOne({ email: req.cookies.user }).populate('cart')
        // console.log("user",searchUser.cart)

        if (searchUser) {
            // console.log('checking _id' , searchUser.cart[0]._id);

            const cartItem = searchUser.cart.find(item => item._id.toString() === productId.toString());
            // console.log('extended cart', cartItem);
            if (cartItem) {
                console.log('cart item to remove', cartItem);
                searchUser.cart.pull(cartItem);
                await searchUser.save()
                res.json({ success: true, message: 'Item removed from cart' });
            }
            else {
                console.log('nothing changed in delete cart');
                res.json({ success: false, message: 'nothing changed' })
            }

        }

    }
    catch (error) {
        console.log('error in delete', error);
        res.send('error in delete')

    }

}

usercontroller.postApplyCoupon = async (req, res) => {
    const couponCode = req.body.couponCode;

    try {
        const couponGiven = await coupon.findOne({ code: couponCode });
        // console.log('coupon details', couponGiven.isActive);
        if (!couponGiven) {
            console.log('coming here if coupon doesnt exist');
            return res.json({ success: true, message: 'Coupon does not exist' });
        } else {
            if (couponGiven.isActive === false) {
                return res.json({ success: true, message: 'Coupon expired!' });
            }
            if (req.session.totalPrice < couponGiven.minimumPrice) {
                res.redirect('/cart?message=min_prc_nt')
            }

            // Apply the coupon discount to the cart total price
            var discountedTotal = req.session.totalPrice * (1 - couponGiven.discountPercent / 100);

            if (discountedTotal > couponGiven.maximumDiscount) {
                discountedTotal = couponGiven.maximumDiscount
            }
            console.log('discounted total', discountedTotal);
            // Update the session with the discounted total
            req.session.discountedTotal = discountedTotal;

            const couponGrandTotal = req.session.grandTotal - discountedTotal
            console.log('grand total after discount', couponGrandTotal);

            req.session.grandTotal = couponGrandTotal;
            return res.json({ success: true, discountedTotal, couponGrandTotal, message: 'Coupon is succesfully applied!' })
            // res.redirect('/cart?message=cp_success')
        }



    }
    catch (error) {
        console.log('Error at coupon applying', error);
        res.status(500).send('Error while applying coupon')
    }
}

usercontroller.postAddressCart = async (req, res) => {
    try {
        const { FullName, ContactNo, BuildingName, PostOffice, place, City, State, PIN, Country } = req.body
        const user = await userSignup.findOne({ email: req.cookies.user })


        const newAddress = {
            FullName,
            ContactNo,
            BuildingName,
            PostOffice,
            place,
            City,
            State,
            PIN,
            Country
        };

        // Push the new address into the user's address array
        user.address.push(newAddress);

        await user.save()

        res.redirect('/cart/placeorder')

    }

    catch (error) {
        console.log('error at post add adress from cart', error);
        res.status(500).send('error at adding address')
    }
}


usercontroller.addtoCartProductpage = async (req, res) => {
    if (!req.cookies.user) {
        return res.redirect('/login');
    }

    try {
        const user = await userSignup.findOne({ email: req.cookies.user }).populate('cart.productId');
        // console.log('user from addtocart product page', user.cart);
        const productId = req.body.productId; // Get the product ID from the form data
        // console.log('from addtoCartproduct page:>', productId);
        // console.log('from user cart', user.cart);



        if (user) {

            const existingProduct = user.cart.find((item) => item.productId._id.toString() === productId)

            // console.log('existing product', existingProduct);


            const getprice = await productList.findOne({ _id: productId })
            // console.log('getprice ', getprice.price);


            // console.log('existing product id+++++ price');
            if (existingProduct) {
                existingProduct.quantity += 1;

            } else {
                // console.log('checking at else');
                const cartItem = {
                    productId: productId,
                    quantity: 1,
                    total: getprice.price
                }

                user.cart.push(cartItem)
            }
            await user.save();
            res.redirect('/products?message=Added%20to%20cart');
        }


    }
    catch (error) {
        console.log('error at adding to cart at product page', error);
        res.status(500).send('error at catch')
    }
};


usercontroller.addToCart = async (req, res) => {
    try {
        const { productId, productPrice } = req.body;

        if (!req.cookies.user) {
            return res.redirect('/login');
        }

        const user = await userSignup.findOne({ email: req.cookies.user });

        const existingCartItem = user.cart.find((item) => item.productId.toString() === productId);

        if (existingCartItem) {

            // If the product exists, you can update its quantity instead of adding a duplicate
            existingCartItem.quantity += 1;
        } else {
            const cartItem = {
                productId: productId, // The product ID of the item
                quantity: 1, // The quantity of the item
                total: productPrice // Set the initial total based on productPrice
            };

            // Push the cartItem to the user's cart array
            user.cart.push(cartItem);
        }

        // Update the total for each cart item based on quantity and product price
        for (const cartItem of user.cart) {
            const product = await productList.findById(cartItem.productId);
            cartItem.total = cartItem.quantity * product.price;
        }

        await user.save();


        res.redirect('/cart'); // Adjust the route accordingly
    } catch (error) {
        console.error(error);
        res.render('error', { errorMessage: 'An error occurred while adding the product to the cart' });
    }
};


usercontroller.addToWishlistIndividual = async (req, res) => {


    if (!req.cookies.user) {
        return res.redirect('/login');
    }

    try {
        const user = await userSignup.findOne({ email: req.cookies.user });
        const productId = req.params.productId;


        // Check if the product is already in the wishlist
        const existingProduct = user.wishlist.find(item => item.productId.toString() === productId);

        if (!existingProduct) {
            // If the product is not in the wishlist, add it
            const wishlistItem = {
                productId: productId,
            };
            user.wishlist.push(wishlistItem);
            await user.save();

            res.status(200).json({ success: true, message: 'Product added to wishlist' });
        } else {
            res.status(200).json({ success: true, message: 'Product already in wishlist' });
        }
    } catch (error) {
        console.error('Error adding product to wishlist:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};



usercontroller.getWishlist = async (req, res) => {

    if (!req.cookies.user) {
        return res.redirect('/login');
    }
    const user = await userSignup.findOne({ email: req.cookies.user })
    const wishlistedItems = await userSignup.findOne({ email: req.cookies.user }).populate('wishlist.productId')

    res.render('../views/user_views/wishlist', { wishlist: wishlistedItems.wishlist, user })
}

usercontroller.deleteItemsfromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const user = await userSignup.findOne({ email: req.cookies.user }).populate('wishlist')

        if (user) {
            const wishlistItem = user.wishlist.find(item => item._id.toString() === productId.toString())
            // console.log('wishlist item under if(user)', wishlistItem);

            user.wishlist.pull(wishlistItem)

            await user.save();

            res.json({ success: true, message: 'Item removed from wishlist' })
        } else {
            console.log('nothing changed when deleting item from wishlist -----------------');
            res.json({ success: false, message: 'nothing changed when deleting item from wishlist' })
        }
    }
    catch (error) {
        console.log('error at delete items from wishlist :-', error);
        res.send('error in delete items from wishlist')
    }
}

usercontroller.getprofile = async (req, res) => {

    if (!req.cookies.user) {
        return res.redirect('/login')
    }

    try {
        const user = await userSignup.findOne({ email: req.cookies.user })
        // console.log('user from cookie', user);
        const firstName = user.firstName
        const lastName = user.lastName
        const email = user.email
        const mobile = user.mobile
        // console.log('user details fetched from get profile', firstName, lastName);


        const addresses = user.address
        const formattedWallet = user.wallet.toLocaleString();
        // console.log('user adress 0',user.address[1]);
        console.log('mesage;;;;;;;', req.query.message);
        if (req.query.message) {
            var message = 'Password changed succesfully'
        }
        res.render('../views/user_views/profile.ejs', { user, addresses, message, formattedWallet })
    }
    catch (error) {
        console.log('Error at get userprofile', error);
        res.status(500).send('Error at user profile')
    }

}

usercontroller.editBasicProfile = async (req, res) => {


    try {
        const { firstName, lastName, mobile } = req.body;
        console.log('consoling first last ', firstName, lastName, mobile);
        const user = await userSignup.findOne({ email: req.cookies.user })

        user.firstName = firstName;
        user.lastName = lastName;
        user.mobile = mobile;

        await user.save();

        res.redirect('/profile')
    }
    catch (error) {
        console.log('error at edit basic details of user', error);
        res.status(500).send('Error at user basic edit');
    }
}

usercontroller.postAddAddress = async (req, res) => {
    try {
        const { FullName, ContactNo, BuildingName, PostOffice, place, City, State, PIN, Country } = req.body
        const user = await userSignup.findOne({ email: req.cookies.user })


        const newAddress = {
            FullName,
            ContactNo,
            BuildingName,
            PostOffice,
            place,
            City,
            State,
            PIN,
            Country
        };

        // Push the new address into the user's address array
        user.address.push(newAddress);

        await user.save()

        res.redirect('/profile')

    }

    catch (error) {
        console.log('error at post add adress', error);
        res.status(500).send('error at post add address')
    }
}

usercontroller.postEditAddress = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user })
        const { AddressID, FullName, ContactNo, BuildingName, PostOffice, place, City, State, PIN, Country } = req.body

        console.log('id', AddressID, FullName, ContactNo, BuildingName, PostOffice, place, City, State, PIN, Country)
        if (user) {
            const index = user.address.findIndex(item => item._id.toString() === AddressID.toString())
            console.log('index ', index);

            if (index !== -1) {

                user.address[index].FullName = FullName,
                    user.address[index].ContactNo = ContactNo,
                    user.address[index].BuildingName = BuildingName,
                    user.address[index].PostOffice = PostOffice,
                    user.address[index].place = place,
                    user.address[index].City = City,
                    user.address[index].State = State,
                    user.address[index].PIN = PIN,
                    user.address[index].Country = Country
            }

            await user.save()
            console.log('Update succesfull');

            res.redirect('/profile')
        }
    }
    catch (error) {

        console.log('Error at updating the address', error);
        res.status(500).send('Error at updating address')
    }
}

usercontroller.deleteUserAddress = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user })
        const { addressID } = req.params;
        // console.log('address id at usercontroller', addressID);

        if (user) {
            const existingAddress = user.address.find(item => item._id.toString() === addressID.toString());
            // console.log('existing address matched', existingAddress);

            if (existingAddress) {
                user.address.pull(existingAddress);
                await user.save()
                res.json({ success: true, message: 'Address removed from the user model' })
            }
            else {
                console.log('Could not delete address');
                res.json({ success: false, message: 'Could not delete address' })
            }
        }
    }
    catch (error) {
        console.log('Error at delete user address', error);
        res.status(500).send('Error at delete user address')
    }
}

usercontroller.getPlaceOrder = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user })

        if (!user) {
            res.redirect('/login')
        }

        if (user.cart.length < 1) {
            res.redirect('/products')
        }

        const grandTotal = req.session.grandTotal;
        console.log('grand total in session ', grandTotal);

        const addresses = await user.address

        res.render('../views/user_views/purchaseProduct', { user, grandTotal, addresses })

    }
    catch (error) {
        console.log('Error at place order page', error);
        res.status(500).send('Error at place order page')
    }
}

usercontroller.postFinalOrderPlacing = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user }).populate('cart.productId')
        
        const selectedPaymentOption = req.body.details.selectedPaymentOption;
        const selectedAddress = req.body.details.selectedAddress;
        const selectedAddressId = user.address.find(address => address._id.toString() === selectedAddress);

        const grandTotal = req.session.grandTotal
        console.log('grand total price', grandTotal);
        console.log('payment method', selectedPaymentOption);

        if (selectedPaymentOption === 'Online payment') {
            console.log('its online payment');
            var instance = new Razorpay({ key_id: 'rzp_test_ddvUrRJNK8Yvou', key_secret: 'wb4J9yrG1vekMjxdHOfMe40k' });

            var options = {
                amount: grandTotal * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "order_rcptid_11"
            };

            instance.orders.create(options, function (err, order) {
                if (order) {
                    console.log(order);
                    console.log('online success')
                    res.json({
                        onlineSuccess: true,
                        order: order,

                        key: "rzp_test_ddvUrRJNK8Yvou",

                    });
                } else if (err) {
                    console.error('error from here', err);
                    // Handle the error and send an appropriate response
                    res.status(500).json({ error: 'Error creating Razorpay order' });
                }
            });

        } else {

            const orderProducts = [];
            // console.log('comin here');

            user.cart.forEach((cartitems) => {
                const orderproduct = {
                    productId: cartitems.productId,
                    quantity: cartitems.quantity
                }

                orderProducts.push(orderproduct);
            })

            const newOrder = new order({
                userId: user._id,
                products: orderProducts,
                totalprice: grandTotal,
                orderStatus: 'Pending',
                paymentMethod: selectedPaymentOption,
                address: selectedAddressId

            })

            await newOrder.save()
            let updateWallet;
            if (selectedPaymentOption === 'WalletPay') {
                try {
                    updateWallet = user.wallet - grandTotal
                    // console.log('user._id', user._id);
                    await userSignup.findOneAndUpdate(
                        { _id: user._id },
                        { $set: { wallet: updateWallet } }
                    );

                }
                catch (error) {
                    console.log('Error at walletpayment ', error);
                    res.status(500).send('Error in payment')
                }
            }
            console.log('updated wallet', updateWallet);

            // Reduce the product quantities in the products collection
            for (const orderProduct of orderProducts) {
                const product = await productList.findById(orderProduct.productId);
                if (product) {
                    // Reduce the product quantity by the ordered quantity
                    product.quantity -= orderProduct.quantity;
                    await product.save();
                }
            }

            await userSignup.findOneAndUpdate(
                { _id: user._id },
                { $pull: { cart: { productId: { $in: orderProducts.map(product => product.productId) } } } }
            );

            // console.log('ordr coming here', onOrder)


            res.json({ success: true });
        }

    }
    catch (error) {
        console.log('error at post final order placing', error);

        // Handle the error and send an appropriate error response
        const errorResponse = {
            success: false,
            message: `${error}An error occurred while placing the order.`,
        };

        res.status(500).send('error');
    }
}

usercontroller.postOnlinePurchase = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user })

        const selectedPaymentOption = req.body.details.selectedPaymentOption;
        const selectedAddress = req.body.details.selectedAddress;
        const selectedAddressId = user.address.find(address => address._id.toString() === selectedAddress);
        const grandTotal = req.session.grandTotal;

        console.log('payment, address--------------', selectedAddressId, selectedPaymentOption);

        const orderProducts = [];
        // console.log('comin here');

        user.cart.forEach((cartitems) => {
            const orderproduct = {
                productId: cartitems.productId,
                quantity: cartitems.quantity
            }

            orderProducts.push(orderproduct);
        })

        const newOrder = new order({
            userId: user._id,
            products: orderProducts,
            totalprice: grandTotal,
            orderStatus: 'Pending',
            paymentMethod: selectedPaymentOption,
            address: selectedAddressId

        })

        await newOrder.save()


        // Reduce the product quantities in the products collection
        for (const orderProduct of orderProducts) {
            const product = await productList.findById(orderProduct.productId);
            if (product) {
                // Reduce the product quantity by the ordered quantity
                product.quantity -= orderProduct.quantity;
                await product.save();
            }
        }

        await userSignup.findOneAndUpdate(
            { _id: user._id },
            { $pull: { cart: { productId: { $in: orderProducts.map(product => product.productId) } } } }
        );

        res.json({ success: true })
    }
    catch (error) {
        console.log('Error at online payment', error);
        res.status(500).send('Error at online payment')
    }
}




usercontroller.getOrders = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user })

        if (!user) {
            res.redirect('/login')
        }
        const orders = await order.find({ userId: user._id }).populate('products.productId')
        // console.log('orders at total order list page-------', orders);
        res.render('../views/user_views/orderlist', { orders: orders, user })

    }
    catch (error) {
        console.log('Error at order list page :----------------', error);
        res.status(500).send('Error at order list page')
    }
}

usercontroller.getOrderDetails = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user });

        if (!user) {
            res.redirect('/login')
        }
        const orderId = req.params.orderId

        // const orders = await order.find()

        const orderDetails = await order.find({ _id: orderId }).populate('products.productId');

        // console.log('order details of particular order id:', orderDetails);


        if (!order) {
            res.send('Order not found')
        }


        res.render('../views/user_views/orderDetails', { orderDetails, orderId, user })

    }
    catch (error) {
        console.log('Error at get order details', error);
        res.status(500).send('Error at Get order details')
    }
}

usercontroller.cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const updateOrder = await order.findByIdAndUpdate(
            orderId,
            { orderStatus: 'cancel_req' },
            { new: true }
        )


        console.log('order cancelled, given the updated order after cancelling', updateOrder);

        const successResponse = {
            success: true,
        };

        res.json(successResponse);

    }
    catch (error) {
        console.log('Error at cancelling order, method post ', error);
        res.status(500).send('Error at canceling order')
    }
}

usercontroller.returnOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log('coming here and order id is ', orderId);

        const updateOrder = await order.findByIdAndUpdate(
            orderId,
            { orderStatus: 'return_req' },
            { new: true }
        )
        console.log('order return requsted, given the updated order after return', updateOrder);

        const successResponse = {
            success: true,
        };

        res.json(successResponse);

    }
    catch (error) {
        console.log('Error while returning order', error);
    }
}

usercontroller.getChangePassProfile = async (req, res) => {

    try {
        const user = await userSignup.findOne({ email: req.cookies.user })
        if (!user) {
            res.redirect('/login')
        }
        res.render('../views/user_views/profilechangepass', { errorMessage: false, user })
    }
    catch (error) {
        console.log('Error at get change password: ', error);
        res.status(500).send('Error at get change password profie')
    }
}

usercontroller.postProfileChangePass = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user })

        if (!user) {
            // Handle the case where the user is not found (e.g., user doesn't exist)
            return res.status(404).send('User not found');
        }

        const currentpass = req.body.currentPassword
        const newPass = req.body.newPassword

        console.log('new pass', newPass);

        console.log('typed password', currentpass);
        const isValidPass = await bcrypt.compare(currentpass, user.password)


        console.log('consoling the matched password is ', isValidPass);


        if (!isValidPass) {
            console.log('coming to incorrect');
            res.render('../views/user_views/profilechangepass', { errorMessage: 'Entered password is wrong!' })
        } else {
            user.password = bcrypt.hashSync(newPass, 2);
            const save = await user.save();
            console.log('saved the password', save)

            res.redirect('/profile?message=pass_change')
        }
    }
    catch (error) {
        console.log('Error at post profile change pass:', error);
        res.status(500).send('Error at Change password in profile: POST')
    }
}


usercontroller.getAfterCheckout = async (req, res) => {
    try {
        const user = await userSignup.findOne({ email: req.cookies.user })

        if (!user) {
            res.redirect('/userhome')
        }
        res.render('../views/user_views/afterorderplaced', { user })
    }
    catch (error) {
        console.log('Error at after checkout page', error);
        res.send('Error')
    }
}

module.exports = usercontroller;
