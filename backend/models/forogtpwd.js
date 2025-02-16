const mongoose = require('mongoose');

const forogotpwdSchema = mongoose.Schema({
    email : {type: String, required: false},
    token: {type: String, required: false},
    visited : {type: Boolean , required: false},
});

module.exports = mongoose.model("ForgotPwd", forogotpwdSchema);