const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  candidateIndex: {
    type: Number,
    required: true
  },
  votedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    trim: true
  }
});

// Ensure one vote per voter per election
voteSchema.index({ election: 1, voter: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);