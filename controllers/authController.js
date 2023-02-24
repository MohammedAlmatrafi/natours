const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createSendTokenResponse = (user, statusCode, resObject) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86_400_000
    ), //day to ms conversion
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  resObject.cookie('jwt', token, cookieOptions);

  let data;
  if (statusCode === 201) {
    user.password = undefined;
    data = { user };
  }

  resObject.status(statusCode).json({
    status: 'success',
    token,
    data
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    userName: req.body.userName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt
  });

  createSendTokenResponse(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError('Please provide email and password', 400));

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.isCorrectPassword(password, user.password)))
    return next(new AppError('Please provide correct email or password', 401));

  createSendTokenResponse(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) make sure token is passed in
  let token;
  const { authorization } = req.headers;
  if (authorization && authorization.startsWith('Bearer')) {
    token = authorization.split(' ')[1];
  }

  if (!token)
    return next(
      new AppError('You are not logged in. Please log in to grant access.', 401)
    );

  //2) verifying token
  const verifiedToken = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );
  //3) check if user exists
  const currentUser = await User.findById(verifiedToken.id);
  if (!currentUser)
    return next(new AppError('User with this token no longer exists.', 401));

  //4) check if user hasn't changed their password
  const changed = currentUser.hasChangedPasswordAfter(verifiedToken.iat);
  if (changed)
    return next(
      new AppError('Password has changed. Please log in again.', 401)
    );

  //5) grant access
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //req.user is passed by protect middleware
    if (!roles.includes(req.user.role))
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    return next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) get POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('There is no user with that email', 404));

  //2) generate random token
  const resetToken = user.createResetToken();
  await user.save({ validateBeforeSave: false });

  //3) send token via email
  const resetURL = `${req.protocol}://${
    req.hostname
  }/api/v1/reset-password/${resetToken}`;
  const message = `Forgot your password?\nReset your password by sending a PATCH request with your new password and password confirm via:\n${resetURL}\nIf you didn't forget your password just ignore this message.`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Natours | Password reset (expires in 10 mins)',
      message
    });

    res.status(200).json({
      status: 'success',
      message: 'Reset token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending an E-mail. Please try again later.'
      ),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get passed token and hashed it
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  //2) find user in DB by hashed token
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() }
  });
  //3) if there is no user send error
  if (!user) return next(new AppError('Token is invalid or has expired', 400));
  //4) otherwise save new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  await user.save();

  createSendTokenResponse(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  const { currentPassword, password, passwordConfirm } = req.body;
  if (!currentPassword)
    return next(new AppError('Please provide currentPassword'), 400);
  if (!(await user.isCorrectPassword(currentPassword, user.password))) {
    return next(new AppError('currentPassword is not correct.'), 401);
  }
  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  createSendTokenResponse(user, 200, res);
});
