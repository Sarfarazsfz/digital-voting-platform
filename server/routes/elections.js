const express = require('express');
const { body, validationResult } = require('express-validator');
const Election = require('../models/Election');
const router = express.Router();

// Get all elections
router.get('/', async (req, res) => {
  try {
    const elections = await Election.find()
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(elections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active elections
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const elections = await Election.find({
      startTime: { $lte: now },
      endTime: { $gte: now }
    });
    res.json(elections);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new election
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('candidates').isArray({ min: 2 }).withMessage('At least 2 candidates required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, candidates, startTime, endTime } = req.body;

    const election = new Election({
      title,
      description,
      candidates: candidates.map(candidate => ({
        name: candidate.name,
        party: candidate.party,
        description: candidate.description
      })),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isActive: true
    });

    await election.save();
    res.status(201).json(election);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;