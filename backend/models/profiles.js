const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
    title: { type: String, required: true }, 
    companyName: { type: String, required: true }, 
    startTime: { type: Date, required: true }, 
    endTime: { type: Date, required: false },
    employmentType: { type: String, required: true } 
});

const educationSchema = new mongoose.Schema({
    institute: { type : String , required : true},
    degree : { type : String , required : true},
    major_minor : { type : String , required : true},
    startTime: { type: Date, required: true }, 
    endTime: { type: Date, required: false },
});


const profileSchema = new mongoose.Schema({
    firstname: { type: String, required: false }, 
    lastname: { type: String, required: false },
    username: { type: String, required: false },
    postID: { type: String, required: false, unique: true },
    file: { type: String, required: false },
    imagePaths: { type: [String], required: false },
    post_type: { type: String, required: false },
    post_desc: { type: String, required: false },
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
    experience: {type: [experienceSchema], required: false },
    education: {type : [educationSchema], required: false},
    skills: {type: [String] , required : true },
});

module.exports = mongoose.model('Profiles', profileSchema);
