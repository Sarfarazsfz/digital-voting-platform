const express = require('express');
const { body, validationResult } = require('express-validator');
const Election = require('../models/Election');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// ✅ GET ALL ELECTIONS (Public - no auth required)
router.get('/', async (req, res) => {
  try {
    const elections = await Election.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: elections.length,
      elections
    });
  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching elections' 
    });
  }
});

// ✅ GET ACTIVE ELECTIONS (Public - no auth required)
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const elections = await Election.find({
      startTime: { $lte: now },
      endTime: { $gte: now },
      isActive: true
    }).populate('createdBy', 'name email');
    
    res.json({
      success: true,
      count: elections.length,
      elections
    });
  } catch (error) {
    console.error('Get active elections error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching active elections' 
    });
  }
});

// ✅ GET SINGLE ELECTION BY ID (Public - no auth required)
router.get('/:id', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }
    
    res.json({
      success: true,
      election
    });
  } catch (error) {
    console.error('Get election by ID error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching election' 
    });
  }
});

// ✅ CREATE NEW ELECTION (Admin only)
router.post('/', [
  adminAuth, // Only admin can create elections
  body('title').notEmpty().withMessage('Title is required'),
  body('description').optional().isString(),
  body('candidates').isArray({ min: 2 }).withMessage('At least 2 candidates required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { title, description, candidates, startTime, endTime } = req.body;

    // Check if end time is after start time
    if (new Date(endTime) <= new Date(startTime)) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Check if election with same title already exists
    const existingElection = await Election.findOne({ title });
    if (existingElection) {
      return res.status(400).json({
        success: false,
        message: 'Election with this title already exists'
      });
    }

    const election = new Election({
      title,
      description,
      candidates: candidates.map(candidate => ({
        name: candidate.name,
        party: candidate.party,
        description: candidate.description,
        votes: 0
      })),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isActive: true,
      createdBy: req.user._id // Set the admin who created this election
    });

    await election.save();

    // Populate createdBy field for response
    await election.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Election created successfully',
      election
    });
  } catch (error) {
    console.error('Create election error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating election',
      error: error.message 
    });
  }
});

// ✅ UPDATE ELECTION (Admin only)
router.put('/:id', [
  adminAuth,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('candidates').optional().isArray({ min: 2 }).withMessage('At least 2 candidates required'),
  body('startTime').optional().isISO8601().withMessage('Valid start time is required'),
  body('endTime').optional().isISO8601().withMessage('Valid end time is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const election = await Election.findById(req.params.id);
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Check if election has already started (prevent modifying active elections)
    if (election.startTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify election that has already started'
      });
    }

    const { title, description, candidates, startTime, endTime, isActive } = req.body;

    // Update fields if provided
    if (title) election.title = title;
    if (description !== undefined) election.description = description;
    if (candidates) {
      election.candidates = candidates.map(candidate => ({
        name: candidate.name,
        party: candidate.party,
        description: candidate.description,
        votes: candidate.votes || 0
      }));
    }
    if (startTime) election.startTime = new Date(startTime);
    if (endTime) election.endTime = new Date(endTime);
    if (isActive !== undefined) election.isActive = isActive;

    // Validate end time is after start time
    if (election.endTime <= election.startTime) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    await election.save();
    await election.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Election updated successfully',
      election
    });
  } catch (error) {
    console.error('Update election error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error while updating election',
      error: error.message 
    });
  }
});

// ✅ DELETE ELECTION (Admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const election = await Election.findById(req.params.id);
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Check if election has already started (prevent deleting active elections)
    if (election.startTime <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete election that has already started'
      });
    }

    await Election.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Election deleted successfully'
    });
  } catch (error) {
    console.error('Delete election error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting election',
      error: error.message 
    });
  }
});

// ✅ GET ELECTION RESULTS (Public - but only after election ends)
router.get('/:id/results', async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Check if election has ended
    const now = new Date();
    if (now < election.endTime) {
      return res.status(403).json({
        success: false,
        message: 'Election results are available only after the election ends'
      });
    }

    // Calculate winner
    let winner = null;
    let maxVotes = 0;
    let isTie = false;

    election.candidates.forEach(candidate => {
      if (candidate.votes > maxVotes) {
        maxVotes = candidate.votes;
        winner = candidate;
        isTie = false;
      } else if (candidate.votes === maxVotes) {
        isTie = true;
      }
    });

    res.json({
      success: true,
      election: {
        _id: election._id,
        title: election.title,
        description: election.description,
        startTime: election.startTime,
        endTime: election.endTime,
        totalVotes: election.totalVotes,
        candidates: election.candidates.sort((a, b) => b.votes - a.votes),
        winner: isTie ? null : winner,
        isTie,
        resultsPublished: true
      }
    });
  } catch (error) {
    console.error('Get election results error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching election results',
      error: error.message 
    });
  }
});

module.exports = router;