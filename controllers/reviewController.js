const Review = require('./../models/reviewModel');
const Tour = require('./../models/tourModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.checkTourExistance = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.body.tour);
  if (!tour) return next(new AppError('No tour found with that ID', 404));
  next();
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
