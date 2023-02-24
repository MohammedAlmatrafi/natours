const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

//protect all routes after this middleware, i.e. needs to be logged in.
router.use(authController.protect);

router.patch('/update-password', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);

router.patch('/update-user', userController.updateMe);
router.delete('/delete-user', userController.deleteMe);

//restrict all routes after this middleware. i.e. allow only admins to access them.
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
