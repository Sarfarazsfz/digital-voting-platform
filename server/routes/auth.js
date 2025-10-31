const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const router = express.Router();

// Voter verification
router.post('/verify', [
  body('voterId').isLength({ min: 10 }).withMessage('Voter ID must be at least 10 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('age').isInt({ min: 18 }).withMessage('Must be at least 18 years old')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { voterId, name, email, age } = req.body;

    // Check if voter already exists
    let user = await User.findOne({ voterId });
    if (user) {
      if (user.hasVoted) {
        return res.status(400).json({ message: 'You have already voted' });
      }
      return res.json({ 
        verified: true, 
        user: { id: user._id, name: user.name, voterId: user.voterId }
      });
    }

    // Create new voter
    user = new User({
      voterId,
      name,
      email,
      age
    });

    await user.save();

    res.json({ 
      verified: true, 
      user: { id: user._id, name: user.name, voterId: user.voterId }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;