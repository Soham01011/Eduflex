const mongoose = require('mongoose');

const likesSchema = new mongoose.Schema({
    postID: { type: String, required: false, unique: true },
    liked : {type : [String] ,required: false}
});


module.exports = mongoose.model('Likes', likesSchema);