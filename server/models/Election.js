const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  candidates: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    party: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    votes: {
      type: Number,
      default: 0
    }
  }],
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

electionSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.startTime) return 'scheduled';
  if (now > this.endTime) return 'completed';
  return 'active';
});

module.exports = mongoose.model('Election', electionSchema);