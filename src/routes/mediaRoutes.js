const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const mediaController = require('../controllers/mediaController');

const router = express.Router();

router.get('/', asyncHandler(mediaController.listMedia));
router.post('/', asyncHandler(mediaController.createMedia));
router.get('/favorites', asyncHandler(mediaController.listFavorites));
router.post('/:id/favorite', asyncHandler(mediaController.addFavorite));
router.delete('/:id/favorite', asyncHandler(mediaController.removeFavorite));
router.post('/:id/rating', asyncHandler(mediaController.upsertRating));
router.delete('/:id/rating', asyncHandler(mediaController.removeRating));
router.patch('/:id', asyncHandler(mediaController.updateMedia));
router.delete('/:id', asyncHandler(mediaController.deleteMedia));
router.get('/:id', asyncHandler(mediaController.getMediaById));

module.exports = router;
