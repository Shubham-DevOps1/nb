const express = require('express');
const router = express.Router();
const { getSkillGap, getRequirementSkillGap } = require('./skillGapController');

router.get('/intelligence/skill-gap', getSkillGap);
router.post('/intelligence/requirement-skill-gap', getRequirementSkillGap);

module.exports = router;
