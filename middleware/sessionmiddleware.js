const session = require('express-session');





const requireAdminAuth = (req, res, next) => {
    if (req.session.adminId) {
        console.log(req.session.adminId);
        next(); // Admin is authenticated, proceed to the next middleware
    } else {
        console.log('session not working correctly');
        res.redirect('/admin/login'); // Admin is not authenticated, redirect to login
    }
};



module.exports = requireAdminAuth;
