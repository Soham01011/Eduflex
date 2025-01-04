const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    companyName: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: false },
    employmentType: { type: String, required: true }
});

const educationSchema = new mongoose.Schema({
    id: { type: String, required: true },
    institute: { type: String, required: true },
    degree: { type: String, required: true },
    major_minor: { type: String, required: false },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: false }
});

const allskillsSchema = new mongoose.Schema({
    username: { type: String, required: false },
    experience: { type: [experienceSchema], required: false, default: [] },
    education: { type: [educationSchema], required: false, default: [] },
    skills: { type: [String], required: false, default: [] }
});

module.exports = mongoose.model('Allskills', allskillsSchema);
