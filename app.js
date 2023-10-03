require('dotenv').config(); // Load environment variables from .env file


const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const mongoose = require('mongoose')

// const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static(__dirname + '/public'));






app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.get('/favicon.ico', (req, res) => res.status(204));



// app.use('/index', indexRouter);
app.use('/admin', adminRouter)
app.use('/', usersRouter);

// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log('mongoDB connected at adminSide');
    })
    .catch((err) => {
        console.log('failed to connect at admin side', err);
    })



app.listen(process.env.PORT || 4000, () => {
  console.log(`connected to http://localhost:${process.env.PORT || 4000}/`);
});
module.exports = app;