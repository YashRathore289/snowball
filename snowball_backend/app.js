var createError = require('http-errors');
require("dotenv").config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors())
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/employee', require('./routes/employee'));
app.use('/product', require('./routes/product'));
app.use('/debt', require('./routes/debt'));
app.use('/companyproduct', require('./routes/companyproduct'));
app.use('/attendance', require('./routes/attendance'));
app.use('/handedgoods', require('./routes/handedgoods'));
app.use('/battery', require('./routes/battery'));
app.use('/shopgoods', require('./routes/shopgoods'));
app.use('/shopowner', require('./routes/shopowner'));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';

setInterval(async () => {
  try {
    const res = await fetch(`${SELF_URL}/users`);
    const data = await res.json();
    console.log(`💓 Keep-alive ping OK — ${data.timestamp}`);
  } catch (err) {
    console.warn(`⚠️ Keep-alive ping failed: ${err.message}`);
  }
}, 14 * 60 * 1000);

module.exports = app;