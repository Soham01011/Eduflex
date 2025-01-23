const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    firstname: { type: String, required: false }, 
    lastname: { type: String, required: false },
    username: { type: String, required: false },
    postID: { type: String, required: false, unique: true },
    file: { type: String, required: false },
    imagePaths: { type: [String], required: false },
    post_type: { type: String, required: false },
    post_subtype: { type: String, required: false },
    post_name: { type: String, required: false },
    post_org:{ type: String, required: false},
    post_cred_id: { type: String, required: false},
    post_url: { type: String, required: false},
    post_likes: { type: Number, required: false },
    hashtags: { type: [String], required: false },
    broken_tags: { type: [String], required: false },
    interface: { type: String, required: false },
    approved: { type: Boolean, required: false },
    mentor_approved: { type: String, required: false },
    model_approved: { type: Boolean, required: false },
    real: { type: Boolean, required: false },
    edited_by: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    start_time : { type: Date, required: false },
    end_time : { type: Date, required: false },
});

module.exports = mongoose.model('Profiles', profileSchema);
