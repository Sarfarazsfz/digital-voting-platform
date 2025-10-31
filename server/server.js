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

// MongoDB connection with SSL FIX
const connectDB = async () => {
  try {
    console.log('🔗 Attempting MongoDB connection with SSL fix...');
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // SSL/TLS FIXES:
      ssl: true,
      tlsAllowInvalidCertificates: true,
      tlsInsecure: true,
      retryWrites: true,
      w: 'majority'
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