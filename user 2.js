const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  room: { // Add room field to store room number
    type: String,
    required: true
  },
  socketid: { 
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
const User = mongoose.model('User', userSchema);
module.exports = User;