const express = require('express')
const getuserprofileLogicRoute = express.Router();

const CSRFToken = require('../models/csrfttoken');
const User = require('../models/users');

const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger');


getuserprofileLogicRoute.post("/getUserProfile", checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const token = req.body.Token; // Adjust token extraction as needed
    const tokencheck = await CSRFToken.findOne({ token });

    if (tokencheck) {
        try {
            const userAccountData = await User.findOne({ username: tokencheck.username });
            if (!userAccountData) {
                return res.status(404).json({ message: "User not found" });
            }

            // Construct the user profile object
            const userProfile = {
                password: userAccountData.password,
                email: userAccountData.email,
                phone_number: userAccountData.phone_number,
                bio: userAccountData.bio,
                dob: userAccountData.dob,
                college: userAccountData.college,
                academicYear: userAccountData.academicYear,
                semester: userAccountData.semester,
                cgpa: userAccountData.cgpa,
                hobby: userAccountData.hobby,
                github: userAccountData.github,
                website: userAccountData.website,
            };
            console.log("user profile : ", userProfile);

            logMessage(`[=] ${req.body.interface} ${userIP} : ${tokencheck.username} retrieved profile data`);
            res.status(200).json(userProfile);
        } catch (error) {
            logMessage(`[*] ${req.body.interface} ${userIP} : Internal server error ${error}`);
            res.status(500).json({ message: "Internal server error" });
        }
    } else {
        res.status(400).json({ message: "Invalid Token" });
    }
});

module.exports = getuserprofileLogicRoute;