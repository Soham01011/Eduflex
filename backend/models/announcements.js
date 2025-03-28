const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title : {type : String , required : true},
    description : {type : String , required : true},
    date : {type : Date , default : Date.now},
    speaker : {type : String , required : true},
    venue : {type : String , required : true},
    time : {type : String , required : true},
    posterimage : {type : String , required : true},
    id: {type : String , required : true},
});

module.exports = mongoose.model('Announcements', announcementSchema);
