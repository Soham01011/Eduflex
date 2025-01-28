const mongoose = require('mongoose');

const testsession = new mongoose.Schema({
    test_id : { type : String , required: false},
    username: {type: String, required: false},
    questions: [
        {
            question: {type: String, required: false},
            answer:  {type: String, required: false}
        }
    ],
    completed: {type: Boolean , default: false},
    dimension: {type: String, required: false},
    feedback: {type: String, required: false},
    counselor: {type: Boolean , required: false},
    startedAt: {type: Date , default: Date.now}
})

module.exports = mongoose.model('testsession',testsession)