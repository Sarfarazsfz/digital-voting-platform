const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Personal Information
  voterId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{10,}$/, 'Voter ID must be at least 10 alphanumeric characters']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [16, 'You must be at least 16 years old'],
    max: [120, 'Please enter a valid age']
  },
  
  // Authentication & Authorization
  password: {
    type: String,
    required: function() {
      return this.role !== 'voter'; // Password required only for admin/users
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['voter', 'admin', 'user'],
      message: 'Role must be either voter, admin, or user'
    },
    default: 'voter'
  },
  
  // Voting Information
  hasVoted: {
    type: Boolean,
    default: false
  },
  votedElections: [{
    election: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Election'
    },
    votedAt: {
      type: Date,
      default: Date.now
    },
    candidateName: String,
    candidateParty: String
  }],
  
  // Profile Information
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // Verification & Security
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Activity Tracking
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const { street, city, state, zipCode, country } = this.address;
  return `${street}, ${city}, ${state} ${zipCode}, ${country}`.trim();
});

// Virtual for user status
userSchema.virtual('status').get(function() {
  if (!this.isActive) return 'suspended';
  if (!this.isVerified) return 'unverified';
  return 'active';
});

// Virtual for voting eligibility
userSchema.virtual('isEligibleToVote').get(function() {
  return this.age >= 18 && this.isActive && this.isVerified;
});

// Virtual for elections voted in count
userSchema.virtual('electionsVotedCount').get(function() {
  return this.votedElections ? this.votedElections.length : 0;
});

// Instance method to check if user has voted in a specific election
userSchema.methods.hasVotedInElection = function(electionId) {
  if (!this.votedElections) return false;
  return this.votedElections.some(vote => 
    vote.election && vote.election.toString() === electionId.toString()
  );
};

// Instance method to add a vote record
userSchema.methods.addVoteRecord = function(electionId, candidateName, candidateParty) {
  if (!this.votedElections) {
    this.votedElections = [];
  }
  
  this.votedElections.push({
    election: electionId,
    candidateName,
    candidateParty,
    votedAt: new Date()
  });
  
  this.hasVoted = this.votedElections.length > 0;
  return this.save();
};

// Instance method to check password (for authenticated users)
userSchema.methods.checkPassword = async function(candidatePassword) {
  if (!this.password) return false; // For voters without passwords
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    age: this.age,
    role: this.role,
    isVerified: this.isVerified,
    isEligibleToVote: this.isEligibleToVote,
    electionsVotedCount: this.electionsVotedCount,
    joinedAt: this.createdAt
  };
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find eligible voters
userSchema.statics.findEligibleVoters = function() {
  return this.find({ 
    age: { $gte: 18 },
    isActive: true,
    isVerified: true 
  });
};

// Static method to find admins
userSchema.statics.findAdmins = function() {
  return this.find({ role: 'admin', isActive: true });
};

// Middleware to hash password before saving
userSchema.pre('save', async function(next) {
  // Only run if password was modified
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware to update lastLogin and loginCount
userSchema.methods.updateLoginStats = function() {
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ age: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'votedElections.election': 1 });

// Compound indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1, isActive: 1 });

// Text search index for name and email
userSchema.index({ 
  name: 'text', 
  email: 'text',
  'address.city': 'text',
  'address.state': 'text'
});

module.exports = mongoose.model('User', userSchema);