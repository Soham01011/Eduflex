const mongoose = require('mongoose');

const pointshistorySchema = new mongoose.Schema({
    username: {type: String , required: false},
<<<<<<< HEAD
=======
    postID: {type: String , required: false},
>>>>>>> 3dc0331f433be0261463b230c21f19153ba9177a
    post_type: { type: String, required: false },
    post_subtype: { type: String, required: false },
    points: {type: Number , required: false},
    time: {type: Date , default: Date.now }

});

module.exports = mongoose.model('Pointshistory', pointshistorySchema);