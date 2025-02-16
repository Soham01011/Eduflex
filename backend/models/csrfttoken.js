const mongoose = require("mongoose");

const csrfTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true, // Token should be unique
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  username: {
    type: String,
    required: true,
    unique: false, 
  },
  interface: {
    type: String,
    required: true,
    unique: false,
  },
  usertype: {
    type: String,
    required: true,
  }
});


const CSRFToken = mongoose.model("CSRFToken", csrfTokenSchema);

module.exports = CSRFToken;
