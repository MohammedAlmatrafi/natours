const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'There must be a review'],
      trim: true
    },
    rating: {
      type: Number,
      required: [true, 'There must be a rating for this review'],
      max: [5, 'Maximum review rating is 5.'],
      min: [1, 'Minimum review rating is 1.']
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'The review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'The review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//unique tour and user id on each review, in other words: each user can post a single review on each tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'userName photo'
  });

  next();
});

reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  //if there are reviews do
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating
    });
  } else {
    //if there are no reviews, put default values.
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0
    });
  }
};

//after saving a review, update ratings count, and average rating
reviewSchema.post('save', async function() {
  //this refers to the current document
  await this.constructor.calcAverageRatings(this.tour);
});

//work around to update ratings after updating or deleting a review. (can't get tourId on post method)
reviewSchema.pre(/^findOneAnd/, async function(next) {
  //this refers to the current query
  this.review = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  await this.review.constructor.calcAverageRatings(this.review.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
