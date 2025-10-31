const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  // Election Reference
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: [true, 'Election reference is required'],
    index: true
  },
  
  // Voter Reference
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Voter reference is required'],
    index: true
  },
  
  // Candidate Information
  candidateIndex: {
    type: Number,
    required: [true, 'Candidate index is required'],
    min: [0, 'Candidate index must be non-negative']
  },
  candidateName: {
    type: String,
    required: [true, 'Candidate name is required'],
    trim: true,
    maxlength: 100
  },
  candidateParty: {
    type: String,
    required: [true, 'Candidate party is required'],
    trim: true,
    maxlength: 100
  },
  
  // Voting Metadata
  ipAddress: {
    type: String,
    required: [true, 'IP address is required for security'],
    trim: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: 500
  },
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  
  // Verification & Security
  isVerified: {
    type: Boolean,
    default: true
  },
  verificationMethod: {
    type: String,
    enum: ['email', 'phone', 'government_id', 'biometric'],
    default: 'email'
  },
  
  // Audit Fields
  castFrom: {
    type: String,
    enum: ['web', 'mobile', 'kiosk', 'api'],
    default: 'web'
  },
  sessionId: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted vote time
voteSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
});

// Virtual for vote age (how long ago it was cast)
voteSchema.virtual('voteAge').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
});

// Instance method to get vote details for display
voteSchema.methods.getVoteDetails = function() {
  return {
    id: this._id,
    election: this.election,
    candidate: {
      name: this.candidateName,
      party: this.candidateParty,
      index: this.candidateIndex
    },
    votedAt: this.createdAt,
    formattedTime: this.formattedTime,
    location: this.location,
    castFrom: this.castFrom
  };
};

// Static method to get votes by election
voteSchema.statics.findByElection = function(electionId) {
  return this.find({ election: electionId })
    .populate('voter', 'name email age')
    .sort({ createdAt: -1 });
};

// Static method to get votes by voter
voteSchema.statics.findByVoter = function(voterId) {
  return this.find({ voter: voterId })
    .populate('election', 'title startTime endTime')
    .sort({ createdAt: -1 });
};

// Static method to get vote count by candidate in an election
voteSchema.statics.getCandidateVotes = function(electionId, candidateIndex) {
  return this.countDocuments({ 
    election: electionId, 
    candidateIndex: candidateIndex 
  });
};

// Static method to get election statistics
voteSchema.statics.getElectionStats = function(electionId) {
  return this.aggregate([
    { $match: { election: mongoose.Types.ObjectId(electionId) } },
    {
      $group: {
        _id: '$candidateIndex',
        candidateName: { $first: '$candidateName' },
        candidateParty: { $first: '$candidateParty' },
        votes: { $sum: 1 },
        firstVote: { $min: '$createdAt' },
        lastVote: { $max: '$createdAt' }
      }
    },
    { $sort: { votes: -1 } }
  ]);
};

// Static method to get voting timeline for an election
voteSchema.statics.getVotingTimeline = function(electionId) {
  return this.aggregate([
    { $match: { election: mongoose.Types.ObjectId(electionId) } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' }
        },
        votes: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ]);
};

// Prevent duplicate votes - one vote per user per election
voteSchema.index({ election: 1, voter: 1 }, { unique: true });

// Index for better query performance
voteSchema.index({ election: 1, candidateIndex: 1 });
voteSchema.index({ voter: 1 });
voteSchema.index({ createdAt: -1 });
voteSchema.index({ ipAddress: 1 });
voteSchema.index({ 'location.country': 1, 'location.region': 1 });

// Compound indexes
voteSchema.index({ election: 1, createdAt: 1 });
voteSchema.index({ voter: 1, createdAt: -1 });

// Text search index (if needed for candidate names/parties)
voteSchema.index({ 
  candidateName: 'text', 
  candidateParty: 'text' 
});

module.exports = mongoose.model('Vote', voteSchema);