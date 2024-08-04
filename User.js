const mongoose = require('mongoose');
const { toJSON, paginate } = require('../src/models/plugins');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const userSchema = mongoose.Schema(
    {
      _id: Number,
      name: String,
      socket_id: Number
    }
  );
userSchema.plugin(toJSON);
userSchema.plugin(paginate);
userSchema.plugin(AutoIncrement, { _id: '_id' });

const User = mongoose.model('User', userSchema);

module.exports = User;