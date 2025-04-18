const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title : {type : String , required : false},
    description : {type : String , required : false},
    date : {type : Date , default : Date.now},
    speaker : {type : String , required : false},
    venue : {type : String , required : false},
    time : {type : String , required : false},
    posterimage : {type : String , required : false},
    id: {type : String , required : false},
    registeredusers : {type : Array , default : []},
    attendedstudnets : {type : Array , default : []},
    eventratingfromstudnets : {type : Array , default : []},
    feedbackfromstudents : {type : Array , default : []},
    creator : {type : String , required : false},
    department : {type : String , required : false},
});

module.exports = mongoose.model('Announcements', announcementSchema);
