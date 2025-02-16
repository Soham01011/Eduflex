const mongoose = require('mongoose');

const menteesSchema = new mongoose.Schema({
    mentor : {type :String , required : true},
    students : {type: Array , required : true},
    username : {type: Array , required :true},
    batch: {type: String, required: true , unique : true},
    timings: {type: String ,required :false}
})

module.exports = mongoose.model('Mentor', menteesSchema);