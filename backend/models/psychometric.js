const mongoose = require('mongoose');

const testsession = new mongoose.Schema({
    test_id : { type : String , required: true},
    username: {type: String, required: true},
    questions: [
        {
            question: {type: String, required: true},
            answer:  {type: String, required: true}
        }
    ],
    completed: {type: Boolean , default: false},
    feedback: {type: String, required: true}
})

module.exports = mongoose.model('testsession',testsession)