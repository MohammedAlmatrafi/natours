const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (object, ...fields) => {
  const filteredObject = { data: {}, length: 0 };
  Object.keys(object).forEach(key => {
    if (fields.includes(key)) {
      filteredObject.data[key] = object[key];
      filteredObject.length++;
    }
  });
  return filteredObject;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) check if password is not passed
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Please use "/update-password" to update your password.',
        400
      )
    );
  }
  //2) filter req.body out of unwanted fields updating (AKA restricting to certain fields)
  const allowedFields = ['userName', 'email'];
  const cleanObj = filterObj(req.body, ...allowedFields);

  if (cleanObj.length === 0)
    return next(
      new AppError(`Please provide ${allowedFields.join(' or ')} at least`)
    );
  //3) update user
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    cleanObj.data,
    {
      new: true
    }
  ).select('userName email _id');
  //4) send response
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use /signup'
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
