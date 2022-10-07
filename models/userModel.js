const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [true, 'user must have a username'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'user must have an E-mail address'],
    trim: true,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'please enter a valid e-mail address']
  },
  photo: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, 'user must have a password'],
    trim: true,
    minlength: 8
  },
  passwordConfirm: {
    type: String,
    required: [true, 'user must confirm password'],
    trim: true,
    validate: {
      validator: function(el) {
        return el === this.password;
      },
      message: 'password and confrim password are not the same'
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

//encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.isCorrectPassword = async function(
  enteredPassword,
  passwordHash
) {
  return await bcrypt.compare(enteredPassword, passwordHash);
};

userSchema.methods.hasChangedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const passwordChangeDateInMS = Math.floor(
      this.passwordChangedAt.getTime() / 1000
    );
    return passwordChangeDateInMS > JWTTimestamp; // 100 > 400
  }
  // false means NOT changed
  return false;
};

userSchema.methods.createResetToken = function() {
  const expiresInMinutes = 10;
  const resetToken = crypto.randomBytes(32).toString('hex');

  const hashedResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  //save hashed password to database
  this.passwordResetToken = hashedResetToken;
  this.passwordResetTokenExpires = Date.now() + expiresInMinutes * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
