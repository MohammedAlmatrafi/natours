const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
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

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser
    }
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError('Please provide email and password', 400));

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.isCorrectPassword(password, user.password)))
    return next(new AppError('Please provide correct email or password', 401));

  res.status(200).json({
    status: 'success',
    token: signToken(user._id)
  });
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
