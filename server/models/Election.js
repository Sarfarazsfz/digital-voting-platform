const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  party: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  votes: {
    type: Number,
    default: 0,
    min: 0
  },
  imageUrl: {
    type: String,
    trim: true,
    default: null
  }
}, {
  _id: true // Ensure each candidate has its own ID
});

const electionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Election title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: ''
  },
  candidates: {
    type: [candidateSchema],
    required: true,
    validate: {
      validator: function(candidates) {
        return candidates && candidates.length >= 2;
      },
      message: 'At least two candidates are required'
    }
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(startTime) {
        return startTime > new Date();
      },
      message: 'Start time must be in the future'
    }
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required'],
    validate: {
      validator: function(endTime) {
        return endTime > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator user ID is required']
  },
  totalVotes: {
    type: Number,
    default: 0,
    min: 0
  },
  // Additional fields for enhanced functionality
  electionType: {
    type: String,
    enum: ['general', 'primary', 'local', 'national'],
    default: 'general'
  },
  location: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'National'
  },
  requirements: {
    minAge: {
      type: Number,
      default: 18,
      min: 16,
      max: 21
    },
    citizenshipRequired: {
      type: Boolean,
      default: true
    },
    voterRegistrationRequired: {
      type: Boolean,
      default: true
    }
  },
  settings: {
    allowWriteIn: {
      type: Boolean,
      default: false
    },
    resultsVisibility: {
      type: String,
      enum: ['immediate', 'after_voting', 'after_election'],
      default: 'after_election'
    },
    voterAuthentication: {
      type: String,
      enum: ['email', 'phone', 'government_id'],
      default: 'email'
    }
  },
  // For tracking and analytics
  views: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // This will create createdAt and updatedAt automatically
  toJSON: { virtuals: true }, // Include virtuals when converting to JSON
  toObject: { virtuals: true }
});

// Virtual for election status
electionSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.startTime) return 'scheduled';
  if (now > this.endTime) return 'completed';
  return 'active';
});

// Virtual for time remaining (in milliseconds)
electionSchema.virtual('timeRemaining').get(function() {
  const now = new Date();
  if (now < this.startTime) return this.startTime - now;
  if (now > this.endTime) return 0;
  return this.endTime - now;
});

// Virtual for formatted time remaining
electionSchema.virtual('formattedTimeRemaining').get(function() {
  const remaining = this.timeRemaining;
  if (remaining === 0) return 'Election ended';
  
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
});

// Virtual for winner (calculated on the fly)
electionSchema.virtual('winner').get(function() {
  if (this.status !== 'completed') return null;
  
  let maxVotes = 0;
  let winner = null;
  let isTie = false;
  
  this.candidates.forEach(candidate => {
    if (candidate.votes > maxVotes) {
      maxVotes = candidate.votes;
      winner = candidate;
      isTie = false;
    } else if (candidate.votes === maxVotes && maxVotes > 0) {
      isTie = true;
    }
  });
  
  return isTie ? null : winner;
});

// Virtual for tie status
electionSchema.virtual('isTie').get(function() {
  if (this.status !== 'completed') return false;
  
  const votes = this.candidates.map(c => c.votes).filter(v => v > 0);
  if (votes.length === 0) return false;
  
  const maxVotes = Math.max(...votes);
  const candidatesWithMaxVotes = this.candidates.filter(c => c.votes === maxVotes);
  return candidatesWithMaxVotes.length > 1;
});

// Virtual for voter turnout (if we had total eligible voters)
electionSchema.virtual('voterTurnout').get(function() {
  // This would require knowing total eligible voters
  // For now, we'll just return the total votes
  return this.totalVotes;
});

// Instance method to check if election is currently active
electionSchema.methods.isCurrentlyActive = function() {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime && this.isActive;
};

// Instance method to get results summary
electionSchema.methods.getResultsSummary = function() {
  const totalVotes = this.totalVotes;
  const results = this.candidates.map(candidate => ({
    name: candidate.name,
    party: candidate.party,
    votes: candidate.votes,
    percentage: totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(2) : 0
  })).sort((a, b) => b.votes - a.votes);
  
  return {
    totalVotes,
    results,
    winner: this.winner,
    isTie: this.isTie,
    status: this.status
  };
};

// Static method to find active elections
electionSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    startTime: { $lte: now },
    endTime: { $gte: now },
    isActive: true
  });
};

// Static method to find upcoming elections
electionSchema.statics.findUpcoming = function() {
  const now = new Date();
  return this.find({
    startTime: { $gt: now },
    isActive: true
  });
};

// Static method to find completed elections
electionSchema.statics.findCompleted = function() {
  const now = new Date();
  return this.find({
    endTime: { $lt: now },
    isActive: true
  });
};

// Middleware to update lastUpdated field before saving
electionSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Index for better query performance
electionSchema.index({ startTime: 1, endTime: 1 });
electionSchema.index({ isActive: 1 });
electionSchema.index({ createdBy: 1 });
electionSchema.index({ 'candidates.votes': -1 });
electionSchema.index({ createdAt: -1 });
electionSchema.index({ electionType: 1, location: 1 });

// Compound index for common queries
electionSchema.index({ isActive: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Election', electionSchema);