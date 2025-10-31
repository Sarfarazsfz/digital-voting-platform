const express = require('express');
const { body, validationResult } = require('express-validator');
const Vote = require('../models/Vote');
const Election = require('../models/Election');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// ✅ CAST VOTE (Authenticated users only)
router.post('/cast', [
  auth,
  body('electionId').isMongoId().withMessage('Valid election ID required'),
  body('candidateIndex').isInt({ min: 0 }).withMessage('Valid candidate index required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { electionId, candidateIndex } = req.body;
    const voterId = req.user._id; // Get from authenticated user

    // Check if election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ 
        success: false,
        message: 'Election not found' 
      });
    }

    // Check if election is active
    const now = new Date();
    if (now < election.startTime) {
      return res.status(400).json({ 
        success: false,
        message: 'Election has not started yet' 
      });
    }

    if (now > election.endTime) {
      return res.status(400).json({ 
        success: false,
        message: 'Election has ended' 
      });
    }

    if (!election.isActive) {
      return res.status(400).json({ 
        success: false,
        message: 'Election is not active' 
      });
    }

    // Check if voter exists and is eligible
    const voter = await User.findById(voterId);
    if (!voter) {
      return res.status(404).json({ 
        success: false,
        message: 'Voter not found' 
      });
    }

    // Check age requirement
    if (voter.age < 18) {
      return res.status(400).json({ 
        success: false,
        message: 'You must be at least 18 years old to vote' 
      });
    }

    // Check if user has already voted in this election
    const existingVote = await Vote.findOne({ 
      election: electionId, 
      voter: voterId 
    });

    if (existingVote) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already voted in this election' 
      });
    }

    // Check if candidate index is valid
    if (candidateIndex >= election.candidates.length) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid candidate selected' 
      });
    }

    // Check if candidate exists and is valid
    const selectedCandidate = election.candidates[candidateIndex];
    if (!selectedCandidate) {
      return res.status(400).json({ 
        success: false,
        message: 'Selected candidate does not exist' 
      });
    }

    // Create vote record
    const vote = new Vote({
      election: electionId,
      voter: voterId,
      candidateIndex: candidateIndex,
      candidateName: selectedCandidate.name,
      candidateParty: selectedCandidate.party,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await vote.save();

    // Update candidate vote count in election
    election.candidates[candidateIndex].votes += 1;
    election.totalVotes += 1;
    await election.save();

    // Update user's voting status for this election
    if (!voter.votedElections) {
      voter.votedElections = [];
    }
    voter.votedElections.push(electionId);
    await voter.save();

    res.json({
      success: true,
      message: 'Vote cast successfully',
      vote: {
        id: vote._id,
        election: election.title,
        candidate: selectedCandidate.name,
        party: selectedCandidate.party,
        timestamp: vote.createdAt
      }
    });

  } catch (error) {
    console.error('Cast vote error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already voted in this election' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while casting vote',
      error: error.message 
    });
  }
});

// ✅ GET ELECTION RESULTS (Public)
router.get('/results/:electionId', async (req, res) => {
  try {
    const election = await Election.findById(req.params.electionId)
      .populate('createdBy', 'name email');
    
    if (!election) {
      return res.status(404).json({ 
        success: false,
        message: 'Election not found' 
      });
    }

    const now = new Date();
    
    // Check if election has ended (show results only after end time)
    if (now < election.endTime) {
      return res.status(403).json({ 
        success: false,
        message: 'Results will be available after the election ends',
        endTime: election.endTime
      });
    }

    // Calculate statistics
    const totalVotes = election.totalVotes;
    const candidatesWithStats = election.candidates.map(candidate => ({
      ...candidate.toObject(),
      percentage: totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(2) : 0
    })).sort((a, b) => b.votes - a.votes);

    // Determine winner
    let winner = null;
    let isTie = false;
    let maxVotes = 0;

    candidatesWithStats.forEach(candidate => {
      if (candidate.votes > maxVotes) {
        maxVotes = candidate.votes;
        winner = candidate;
        isTie = false;
      } else if (candidate.votes === maxVotes && maxVotes > 0) {
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
        totalVotes: totalVotes,
        candidates: candidatesWithStats,
        winner: isTie ? null : winner,
        isTie: isTie,
        resultsPublished: true
      }
    });

  } catch (error) {
    console.error('Get results error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Election not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching results',
      error: error.message 
    });
  }
});

// ✅ GET USER'S VOTING HISTORY (Authenticated users only)
router.get('/my-votes', auth, async (req, res) => {
  try {
    const votes = await Vote.find({ voter: req.user._id })
      .populate('election', 'title startTime endTime')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: votes.length,
      votes: votes.map(vote => ({
        id: vote._id,
        election: vote.election.title,
        candidate: vote.candidateName,
        party: vote.candidateParty,
        votedAt: vote.createdAt,
        electionPeriod: {
          start: vote.election.startTime,
          end: vote.election.endTime
        }
      }))
    });
  } catch (error) {
    console.error('Get my votes error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching voting history',
      error: error.message 
    });
  }
});

// ✅ GET VOTE STATISTICS (Admin only - optional)
router.get('/stats/:electionId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Admin access required' 
      });
    }

    const election = await Election.findById(req.params.electionId);
    if (!election) {
      return res.status(404).json({ 
        success: false,
        message: 'Election not found' 
      });
    }

    const totalVotes = await Vote.countDocuments({ election: req.params.electionId });
    const votesByCandidate = await Vote.aggregate([
      { $match: { election: election._id } },
      { $group: { _id: '$candidateIndex', count: { $sum: 1 } } }
    ]);

    const voterDemographics = await Vote.aggregate([
      { $match: { election: election._id } },
      {
        $lookup: {
          from: 'users',
          localField: 'voter',
          foreignField: '_id',
          as: 'voterInfo'
        }
      },
      { $unwind: '$voterInfo' },
      {
        $group: {
          _id: null,
          averageAge: { $avg: '$voterInfo.age' },
          totalVoters: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalVotes,
        votesByCandidate,
        demographics: voterDemographics[0] || { averageAge: 0, totalVoters: 0 },
        turnoutRate: totalVotes // You can calculate actual turnout rate if you have total eligible voters
      }
    });

  } catch (error) {
    console.error('Get vote stats error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Election not found' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching statistics',
      error: error.message 
    });
  }
});

// ✅ VERIFY IF USER HAS VOTED IN ELECTION (Authenticated users only)
router.get('/has-voted/:electionId', auth, async (req, res) => {
  try {
    const vote = await Vote.findOne({ 
      election: req.params.electionId, 
      voter: req.user._id 
    });

    res.json({
      success: true,
      hasVoted: !!vote,
      voteDetails: vote ? {
        candidate: vote.candidateName,
        party: vote.candidateParty,
        votedAt: vote.createdAt
      } : null
    });
  } catch (error) {
    console.error('Check vote status error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid election ID' 
      });
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error while checking vote status',
      error: error.message 
    });
  }
});

module.exports = router;