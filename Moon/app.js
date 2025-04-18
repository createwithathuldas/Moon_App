var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const exphbs = require('express-handlebars');
var usersRouter = require('./routes/users');
var adminRouter = require('./routes/admin');
const { connectToDatabase } = require('./config/connection');
var fileUpload = require('express-fileupload');
const session = require('express-session');
const flash = require('connect-flash');
const moment = require('moment'); // For date formatting
const Handlebars = require('handlebars');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

const hbs = exphbs.create({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    // Robust date formatting using moment.js
    formatDate: function(date, format) {
      try {
        // Handle null/undefined date
        if (!date) return '';
        
        // Handle invalid date
        const momentDate = moment(date);
        if (!momentDate.isValid()) return 'Invalid Date';
        
        // Handle null/undefined format or non-string format
        const formatString = (typeof format === 'string') ? format : 'MMMM Do YYYY, h:mm:ss a';
        
        return momentDate.format(formatString);
      } catch (error) {
        console.error('Date formatting error:', error);
        return 'Date Error';
      }
    },
    
    // Check if two values are equal
    eq: function(a, b) {
      return a === b;
    },
    
    // Check if two values are not equal
    neq: function(a, b) {
      return a !== b;
    },
    
    // Check if value is greater than
    gt: function(a, b) {
      return a > b;
    },
    
    // Check if value is less than
    lt: function(a, b) {
      return a < b;
    },
    
    // Check if value is greater than or equal to
    gte: function(a, b) {
      return a >= b;
    },
    
    // Check if value is less than or equal to
    lte: function(a, b) {
      return a <= b;
    },
    
    // Logical AND
    and: function() {
      return Array.prototype.slice.call(arguments).every(Boolean);
    },
    
    // Logical OR
    or: function() {
      return Array.prototype.slice.call(arguments).some(Boolean);
    },
    
    // Check if value is in an array
    includes: function(array, value) {
      return array && array.includes(value);
    },
    
    // Stringify JSON
    json: function(context) {
      return JSON.stringify(context);
    },
    
    // Convert to lowercase
    lowercase: function(str) {
      return str && typeof str === 'string' ? str.toLowerCase() : str;
    },
    
    // Convert to uppercase
    uppercase: function(str) {
      return str && typeof str === 'string' ? str.toUpperCase() : str;
    },
    
    // Truncate string
    truncate: function(str, len) {
      if (str && str.length > len) {
        return str.substring(0, len) + '...';
      }
      return str;
    },
    
    // Check if user has a specific role
    hasRole: function(user, role) {
      return user && user.roles && user.roles.includes(role);
    },
    
    // Times helper for loops
    times: function(n, block) {
      let accum = '';
      for(let i = 0; i < n; ++i) {
        accum += block.fn(i);
      }
      return accum;
    },
    stringify: function(value) {
      return value.toString();
    },
    
    // If condition helper
    ifCond: function(v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
          return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
          return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
          return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
          return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
          return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
          return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
          return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
          return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
          return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    }
  }
});


app.engine('hbs', hbs.engine);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
connectToDatabase()
    .then(() => {
        console.log('Database connection established');
    })
    .catch((err) => {
        console.error('Failed to establish database connection', err);
    });
app.use(fileUpload());

app.use(session({
  secret: '123', // Change this to a secure key
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000,  // Set cookie to expire in 7 days
    httpOnly: true,                    // Makes the cookie accessible only by the server
    secure: process.env.NODE_ENV === 'production', 
  }
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash(); // Accessible as `messages` in templates
  next();
});

app.use('/', usersRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Middleware to check if the user is logged in
app.use((req, res, next) => {
  if (req.session && req.session.user && req.session.user.isLoggedIn) {
    // User is logged in, you can use req.session.user info in your views or API requests
    res.locals.user = req.session.user;
  } else {
    // If not logged in, you can redirect to the login page or handle it accordingly
    res.redirect('/login');
    return; // Prevent further processing
  }
  next();
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;