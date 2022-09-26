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
  }
});

//encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.isCorrectPassword = async function(
  enteredPassword,
  passwordHash
) {
  return await bcrypt.compare(enteredPassword, passwordHash);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
