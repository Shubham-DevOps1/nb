const express = require('express');
const router = express.Router();
const { searchEmployees } = require('./searchController');

// Map POST /api/search to the controller
router.post('/search', searchEmployees);

module.exports = router;
