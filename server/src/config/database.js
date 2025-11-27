const mongoose = require('mongoose');
const logger = require('../utils/logger');

mongoose.set('strictQuery', false);

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection disconnected');
});

const connectDB = async (uri, options) => {
  try {
    await mongoose.connect(uri, options);
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

module.exports = { connectDB };