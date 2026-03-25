const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const mediaController = require('../controllers/mediaController');

const router = express.Router();

router.get('/', asyncHandler(mediaController.listMedia));
router.get('/:id', asyncHandler(mediaController.getMediaById));

module.exports = router;
