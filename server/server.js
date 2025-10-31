const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/elections', require('./routes/elections'));
app.use('/api/votes', require('./routes/votes'));

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Voting Platform API is running!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// API Documentation route - ADD THIS
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Voting Platform API Documentation',
    endpoints: {
      auth: {
        'POST /api/auth/admin/register': 'Register first admin',
        'POST /api/auth/admin/login': 'Admin login',
        'POST /api/auth/register': 'User registration',
        'POST /api/auth/login': 'User login',
        'POST /api/auth/verify': 'Voter verification',
        'GET /api/auth/me': 'Get current user profile'
      },
      elections: {
        'GET /api/elections': 'Get all elections',
        'GET /api/elections/active': 'Get active elections',
        'GET /api/elections/:id': 'Get single election',
        'POST /api/elections': 'Create election (Admin only)',
        'PUT /api/elections/:id': 'Update election (Admin only)',
        'DELETE /api/elections/:id': 'Delete election (Admin only)',
        'GET /api/elections/:id/results': 'Get election results'
      },
      votes: {
        'POST /api/votes/cast': 'Cast vote',
        'GET /api/votes/results/:electionId': 'Get election results',
        'GET /api/votes/my-votes': 'Get user voting history',
        'GET /api/votes/stats/:electionId': 'Get vote statistics (Admin only)',
        'GET /api/votes/has-voted/:electionId': 'Check if user voted'
      }
    }
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    console.log('🔗 Attempting MongoDB connection...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB Connected:', conn.connection.host);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('💡 Next steps:');
    console.log('   1. Check environment variables in Render');
    console.log('   2. Verify MongoDB Atlas network access');
    console.log('   3. Check connection string format');
  }
};

// Connect to database
connectDB();

// Database connection events
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
});

// 404 Handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    suggestion: 'Check /api/docs for available endpoints'
  });
});