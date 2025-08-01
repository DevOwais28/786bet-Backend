const express = require('express');
const { authenticate } = require('../middleware/auth.middleware.js');
const {
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/profile.controller.js');

const router = express.Router();

router.get('/', authenticate, getProfile);
router.put('/', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
