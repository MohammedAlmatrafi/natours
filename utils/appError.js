class AppError extends Error {
  constructor(message, statusCode) {
    super();
    this.message = message;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    //adds "this.stack" to see where the error happened.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
