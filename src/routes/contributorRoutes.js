const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const contributorController = require('../controllers/contributorController');

const router = express.Router();

router.get('/', asyncHandler(contributorController.listContributors));
router.get('/:id', asyncHandler(contributorController.getContributorById));

module.exports = router;
