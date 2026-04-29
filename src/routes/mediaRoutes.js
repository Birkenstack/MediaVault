const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const mediaController = require('../controllers/mediaController');

const router = express.Router();

router.get('/', asyncHandler(mediaController.listMedia));
router.get('/favorites', asyncHandler(mediaController.listFavorites));
router.post('/:id/favorite', asyncHandler(mediaController.addFavorite));
router.delete('/:id/favorite', asyncHandler(mediaController.removeFavorite));
router.get('/:id', asyncHandler(mediaController.getMediaById));

module.exports = router;
