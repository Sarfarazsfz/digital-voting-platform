const express = require('express');
const { body, validationResult } = require('express-validator');
const Vote = require('../models/Vote');
const Election = require('../models/Election');
const User = require('../models/User');
const router = express.Router();

// Cast vote
router.post('/cast', [
  body('electionId').isMongoId().withMessage('Valid election ID required'),
  body('voterId').isMongoId().withMessage('Valid voter ID required'),
  body('candidateIndex').isInt({ min: 0 }).withMessage('Valid candidate index required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { electionId, voterId, candidateIndex } = req.body;

    // Check if election exists and is active
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    const now = new Date();
    if (now < election.startTime || now > election.endTime) {
      return res.status(400).json({ message: 'Election is not active' });
    }

    // Check if voter exists and hasn't voted
    const voter = await User.findById(voterId);
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    if (voter.hasVoted) {
      return res.status(400).json({ message: 'You have already voted in an election' });
    }

    // Check if candidate index is valid
    if (candidateIndex >= election.candidates.length) {
      return res.status(400).json({ message: 'Invalid candidate' });
    }

    // Create vote
    const vote = new Vote({
      election: electionId,
      voter: voterId,
      candidateIndex,
      ipAddress: req.ip
    });

    await vote.save();

    // Update candidate vote count
    election.candidates[candidateIndex].votes += 1;
    await election.save();

    // Mark voter as voted
    voter.hasVoted = true;
    await voter.save();

    res.json({ message: 'Vote cast successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already voted in this election' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Get election results
router.get('/results/:electionId', async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    res.json({
      title: election.title,
      candidates: election.candidates,
      totalVotes: election.candidates.reduce((sum, candidate) => sum + candidate.votes, 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;