const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const genreController = require('../controllers/genreController');

const router = express.Router();

router.get('/', asyncHandler(genreController.listGenres));

module.exports = router;
