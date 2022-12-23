const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// 1) GLOBAL MIDDLEWARES
//Set security HTTP headers
app.use(helmet());

//Development loggging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//rate limitng, preventing too many requests
const limiter = rateLimit({
  max: 100,
  windowMs: 3_600_000, //one hour in ms
  message: 'Too many requests, please try again later.'
});
app.use('/api', limiter);

//parsing data from body into req.body. max accepted size 10kb
app.use(express.json({ limit: '10kb' }));

//sanitizing (mongo) noSql injection attacks
app.use(mongoSanitize());

//sanitizing xss attacks
app.use(xss());

//prevent parameter pollution (duplicate url queries)
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

//serving static files
app.use(express.static(`${__dirname}/public`));

//test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES middwares
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

//on all HTTP requests (*)anywhere, if they made it that far in middleware stack just call error middleware
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

//error middleware
app.use(globalErrorHandler);
module.exports = app;
