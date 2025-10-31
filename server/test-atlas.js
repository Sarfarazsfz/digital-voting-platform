const mongoose = require('mongoose');
require('dotenv').config();

const testAtlas = async () => {
    try {
    console.log('🔗 Testing FINAL MongoDB Atlas connection...');
    console.log('Using cluster: cluster0.7smikhq.mongodb.net');
    
    await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    
    console.log('✅ SUCCESS! Connected to MongoDB Atlas');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    
    // Create a test collection to verify write access
    const testCollection = mongoose.connection.db.collection('test_connection');
    await testCollection.insertOne({
        test: 'connection',
        timestamp: new Date(),
        status: 'success'
    });
    console.log('✅ Database write test successful!');
    
    await mongoose.connection.close();
    console.log('🎉 ALL TESTS PASSED! Ready for deployment to Render!');
    
    } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('💡 Quick fixes:');
    console.log('   1. Check if password is correct: h2orJnyusdPwOvIb');
    console.log('   2. Make sure IP 0.0.0.0/0 is whitelisted in MongoDB Atlas');
    console.log('   3. Verify cluster0.7smikhq is your actual cluster');
    }
};

testAtlas();