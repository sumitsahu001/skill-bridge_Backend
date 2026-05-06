const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['USER_REGISTERED', 'JOB_POSTED', 'APPLICATION_SUBMITTED', 'ACCOUNT_DELETED', 'JOB_CLOSED', 'STATUS_CHANGED']
  },
  target: {
    type: String, // e.g. Job Title, User Email
    default: ''
  },
  metadata: {
    type: Object, // Any extra info
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('Activity', ActivitySchema);
