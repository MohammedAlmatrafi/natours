const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateErrorDB = err => {
  const message = `Duplicate field ${
    //err.keyValue.name
    Object.entries(err.keyValue)
  }, Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = err => {
  const message = `Invalid input data: ${err.message.replace(
    'Validation failed: ',
    ''
  )}`;
  return new AppError(message, 400);
};

const handleInvalidTokenError = () =>
  new AppError('Invalid token. Please log in again.', 401);

const handleExpiredTokenError = () =>
  new AppError('Token has expired. Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};
const sendErrorProd = (err, res) => {
  //operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });

    // Programming or other unknown error: don't leak error details
  } else {
    //1: LOG ERROR
    console.error('ERROR 💥', err);
    //2: SEND GENERIC MESSAGE
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong :('
    });
  }
};

//global error handling middleware, defined by 5 args (error first)
//trigger this middleware by passing the error object to the next();
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    //copy original error: it's not a good practice to modify original function variable
    let error = { ...err };
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateErrorDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError"') error = handleInvalidTokenError();
    if (err.name === 'TokenExpiredError') error = handleExpiredTokenError();
    sendErrorProd(error, res);
  }
};
