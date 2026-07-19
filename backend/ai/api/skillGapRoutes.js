const express = require('express');
const router = express.Router();
const { getSkillGap } = require('./skillGapController');

router.get('/intelligence/skill-gap', getSkillGap);

module.exports = router;
