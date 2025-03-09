const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    mentor : {type: String, required : true},
    course_name : {type: String , required : true},
    class_name: {type: String , requried: true },
    department: { type: String , required: true},
    students: {type: Array, requried: true},
    username: {type: Array, rqeuired: true}
});

module.exports = mongoose.model('Announcements', announcementSchema);
