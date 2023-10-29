
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { Parser } = require('json2csv');
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
    try {
        if (req.session.adminId) {
            res.redirect('/admin/dash')
        }
        res.render('../views/admin_views/adminlogin', { message: false })

    } catch (error) {
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
        } else if (adminverify.password !== req.body.password) {
            res.render('../views/admin_views/adminlogin', { message: "Password is wrong!" })
        }

    } catch (err) {
        console.log('error from saving data to schema', err);
        res.send('failed')
    }
}

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

adminController.getAdminDash = async (req, res) => {

    const pipeline1 = [
        {
            $match: {
                orderStatus: "Delivered",
            },
        },
        {
            $group: {
                _id: null,
                totalOrders1: { $sum: 1 },
            },
        },
    ];
    const result1 = await order.aggregate(pipeline1);
    const totalOrders1 = result1[0] ? result1[0].totalOrders1 : 0;

    const pipeline2 = [
        {
            $match: {
                orderStatus: "Delivered",
            }
        },
        {
            $group: {
                _id: null,
                totalSalesAmount: { $sum: '$totalprice' }
            }
        }
    ]
    const totalSales = await order.aggregate(pipeline2)
    const totalSalesAmount = totalSales[0] ? totalSales[0].totalSalesAmount : 0;
    // console.log('total sales amount', totalSalesAmount);
    const formattedSalesAmount = totalSalesAmount.toLocaleString('en-IN', {
        useGrouping: true,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });

    const pipeline4 = [
        {
            $match: {
                orderStatus: "Delivered",
            },
        },
        {
            $unwind: "$products"
        },
        {
            $lookup: {
                from: "products",
                localField: "products.productId",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        {
            $unwind: "$productInfo"
        },
        {
            $group: {
                _id: null,

                totalPurchasePrice: {
                    $sum: {
                        $multiply: [
                            { $toDouble: "$products.quantity" },
                            { $toDouble: "$productInfo.purchaseRate" }
                        ]
                    }
                }
            }
        }
    ];
    const totalProfit4 = await order.aggregate(pipeline4);

    const final = totalSalesAmount - totalProfit4[0].totalPurchasePrice

    const pipeline = [
        {
            $match: {
                orderStatus: "Delivered",
            },
        },
        {
            $unwind: "$products"
        },
        {
            $lookup: {
                from: "products",
                localField: "products.productId",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        {
            $unwind: "$productInfo"
        },
        {
            $group: {
                _id: null, // Group all documents into a single group
                totalRevenue: {
                    $sum: "$totalprice" // Calculate the sum of the 'totalprice' field
                },
                totalPurchaseRate: {
                    $sum: {
                        $multiply: [
                            { $toDouble: "$products.quantity" },
                            { $toDouble: "$productInfo.purchaseRate" }
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalRevenue: 1,
                totalPurchaseRate: 1
            }
        }
    ];
    const totalRevenueResult = await order.aggregate(pipeline);
    const totalRevenue = totalRevenueResult[0] ? totalRevenueResult[0].totalRevenue : 0;

    const pipeline5 = [{
        $match: {
            orderStatus: "Delivered"
        }
    },
    {
        $group: {
            _id: "$paymentMethod", // Group by payment method
            count: { $sum: 1 },    // Count the occurrences of each payment method
        },
    },
    ];

    const paymentCounts = await order.aggregate(pipeline5).exec();

    const pipeline6 = [
        {
            $match: {
                orderStatus: "Delivered"
            }
        },
        {
            $unwind: "$products" // Unwind the products array
        },
        {
            $lookup: {
                from: "products", // The name of the product collection
                localField: "products.productId",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        {
            $unwind: "$productInfo" // Unwind the productInfo array
        },
        {
            $group: {
                _id: "$productInfo.category", // Group by the category from the productInfo
                count: { $sum: 1 } // Count the occurrences of each category
            }
        }
    ];

    const categoryCounts = await order.aggregate(pipeline6).exec();
    // console.log('category count', categoryCounts);

    const pipeline7 = [
        {
            $match: {
                orderStatus: "Delivered", // You may adjust this to match your criteria
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$orderDate" },
                    month: { $month: "$orderDate" }
                },
                totalSales: { $sum: "$totalprice" }
            }
        },
        {
            $project: {
                _id: 0,
                year: "$_id.year",
                month: "$_id.month",
                totalSales: 1
            }
        },
        {
            $sort: {
                year: 1,
                month: 1
            }
        }
    ]

    const monthlySalesData = await order.aggregate(pipeline7).exec()
    const monthlySalesArray = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const salesData = monthlySalesData.find(data => data.month === month);
        return salesData ? salesData.totalSales : 0;
    });
    res.render('../views/admin_views/admindash', { totalOrders1, totalSalesAmount: formattedSalesAmount, totalProfitAmount: final, paymentCounts, categoryCounts, monthlySalesArray })
}


adminController.getSalesReportPage = async (req, res) => {
    try {
        const salesChart = await order.find({ orderStatus: "Delivered" }).populate('userId').populate('products.productId');
        // console.log('sales delivered', salesChart)
        res.render('../views/admin_views/salesreport', { salesChart })
    }
    catch (error) {
        console.log('error at get sales report page');
        res.send('error')
    }
}

adminController.downloadSalesReport = async (req, res) => {
    const { startDate, endDate } = req.query
    try {
        const salesResult = await order.find({
            orderStatus: 'Delivered',
            orderDate: { $gte: startDate, $lte: endDate },
        })
        //   .populate('userId').populate('products.productId');

        const data = salesResult.map((order) => ({
            date: order.orderDate.toISOString().substring(0, 10),
            orderId: order._id,
            username: order.address.FullName,
            paymentMethod: order.paymentMethod,
            totalAmount: order.totalprice,
        }));
        // console.log('dajhdiufh',data);
        res.json(data);
    }
    catch (error) {
        console.log('Error at download sales report', error);
        res.send('Error at downloading sales report')
    }
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
        console.error(error);
        res.send('Error fetching category list');
    }
};


adminController.postAddCategory = async (req, res) => {
    try {
        const { category } = req.body;
        const categoryRegex = new RegExp(`^${category}$`, 'i');
        const existingCategory = await ProductCategory.findOne({ categoryName: categoryRegex });

        if (existingCategory) {
            const categoryList = await ProductCategory.find();
            return res.render('../views/admin_views/category', { categoryList, errorMessage: 'Category already exists' });
        }

        const newCategory = new ProductCategory({ categoryName: category });
        await newCategory.save()
        res.redirect('/admin/category')
    } catch (error) {
        console.log(error);
        res.send('An error occured while saving the category')
    }
}

adminController.getEditCategory = async (req, res) => {
    try {
        const category = await ProductCategory.findById(req.params.categoryId);
        res.render('../views/admin_views/editcategory', { category });
    } catch (error) {
        console.error(error);
        res.send('Error fetching category details');
    }
};

adminController.updateCategory = async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        const newCategoryName = req.body.category;
        const existingCategory = await ProductCategory.findOne({ categoryName: newCategoryName });

        if (existingCategory) {
            const categoryList = await ProductCategory.find();
            return res.render('../views/admin_views/category', { categoryList, errorMessage: 'Category already exists' });
        }
        const result = await ProductCategory.updateOne(
            { _id: categoryId },
            { $set: { categoryName: newCategoryName } }
        );
        res.redirect('/admin/category'); // Redirect back to the category list
    } catch (error) {
        console.error(error);
        res.send('Error updating category');
    }
};

adminController.toggleListStatus = async (req, res) => {
    try {
        const category = await ProductCategory.findById(req.params.categoryId);
        if (!category) {
            return res.status(404).send('Category not found');
        }

        category.isUnlisted = !category.isUnlisted;
        await category.save();
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
            const selectedCategory = await ProductCategory.findOne({ _id: category });
            console.log('offer', offer);
            let offerPrice;
            if (offer) {
                offerPrice = Math.floor(price - (price * (offer / 100)))
                console.log(offerPrice);
            } else {
                offerPrice = 0
            }
            if (!selectedCategory) {
                return res.send('Selected category not found'); // Handle category not found case
            }
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
        if (offer) {
            offerPrice = Math.floor(price - (price * (offer / 100)));
            console.log(offerPrice);
        } else {
            offerPrice = 0;
        }
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
                const walletTrans = {
                    date: new Date(),
                    amount: returnToWallet,
                    transactionType: "Credit"
                }
                await userSignup.findOneAndUpdate(
                    { _id: payuser.userId },
                    {
                        $set: { wallet: updateWallet },
                        $push: { walletTransaction: walletTrans }
                    }
                );
                // console.log('Updated Wallet Amount:', updateWallet);
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
        res.json({ message: 'Order status updated successfully', updatedOrder });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
}

adminController.getCompleteOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const ordered = await order.findById(orderId).populate('products.productId')
        res.render('../views/admin_views/detailedOrderView', { ordered })
    }
    catch (error) {
        console.log('Error at detailed order view', error);
        res.send('Error while fetching Order details')
    }
}


adminController.getCoupon = async (req, res) => {
    const mess = req.query.message;
    if (mess) {
        var message = 'Succesfully added coupon!';
    }
    //    console.log('mess and message', mess,message);
    try {
        const coupons = await coupon.find();

        const currentDate = new Date();
        for (const couponItem of coupons) {
            if (couponItem.expirationDate < currentDate) {
                couponItem.isActive = false;
                await couponItem.save(); // Save the updated coupon
            }
        }
        res.render('../views/admin_views/coupon.ejs', { message, coupons })
    } catch (error) {
        console.log('error at coupons listing', error);
        res.send('Error')
    }
}

adminController.postCoupon = async (req, res) => {
    try {
        const { code, discountPercent, minimumPrice, maximumDiscount, expirationDate, description, isActive } = req.body;
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
        console.error('Error creating coupon:', error);
        res.status(500).send('Error creating coupon');
    }
}

adminController.deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.couponId
        await coupon.findByIdAndDelete(couponId)
        return res.json({ succes: true })
    }
    catch (error) {
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