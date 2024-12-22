const express = require('express')
const deletebatchlogicRoute = express.Router()

/**
 * This is the route to delete the batch created by the mentor. Flow:
 * 1) check token : checks the validity of the user
 * 2) delete batch : checks if the batch is under mentor and then deletes it
 * 3) Done, that's it
 */

const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger');

const CSRFToken = require('../models/csrfttoken')
const Mentor = require('../models/mentees')

deletebatchlogicRoute.post('/delete-batch',checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const { username, batchName,Token } = req.body; // Extract username and batchName from request body
    if (Token) 
    {    

        try {
            tocken_check = await CSRFToken.findOne({ token : Token})
            if (tocken_check.username == username )
            {// Find and delete the batch for the given username and batch name
                const result = await Mentor.findOneAndDelete({
                    mentor: username,
                    batch: batchName
                });

                if (result) {
                    logMessage(`[=] ${userIP} : ${username} deleted thier batch`);
                    res.status(200).json({ message: 'Batch deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Batch not found' });
                }
            }
        } catch (error) {
            logMessage(`[*] ${userIP} : Internal server error while delteing batch :${error}`);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});

module.exports = deletebatchlogicRoute;