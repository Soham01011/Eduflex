/**
 * This route will only used by the mobile app
 */
const express = require('express')
const getuserprofileLogicRoute = express.Router();

/**
 * User      : Models of users to fetch their data.
 * 
 * CSRFToken : Model which stores the user session token.
 */

const CSRFToken = require('../models/csrfttoken');
const User = require('../models/users');

/**
 *
 * checkToken : Check the token given to the user in the session and also checks if 
 *              it is valid or invalid if not then user will be logged out and if 
 *              the token is incorrect then also the user will the redirected to
 *              loginpage (To understand working open middleware,checkToken)
 * 
 * logMessage : A minimal function which logs all the requests to the server make sure 
 *              to understand the format of the logs and do log all the erros and user
 *              activities. This can be useflu for further studies. 
 */

const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger');

/**
 * Steps :
 *          - Takes the token from the post request body and checks it with username
 *          - Then returns the users data 
 */
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