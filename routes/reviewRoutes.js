const express = require('express');

const router = express.Router();

//getting all the reviews
router.route('/').get((req, res, next) => {
  res.status(200).json({ status: 'success' });
});

module.exports = router;
