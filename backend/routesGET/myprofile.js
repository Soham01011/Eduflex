/**
 * This route is only for the mobile app to pull thier data
 */

const express =require('express');
const myprofileRoute = express.Router();
require("dotenv").config();

/**
 * fetchUser  : A utility which you can use and fetch the username directly from the 
 *              cookie or the request body (To userstand its working open utils/fetchUser)
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
const {fetchUser} = require('../utils/fetchUser');

/**
 * User     : Models of users to fetch their data.
 * 
 * Profiles : Model which stores the user posts.
 */
const User = require('../models/users');
const Profiles = require('../models/profiles');

/**
 * BASE_URL : This is an env variable to provide your ngrok link and will be used in the 
 *            front-end to pull some local script to run or to display the user data 
 */
const BASE_URL = process.env.BASE_URL;

/**
 * This route is designed to provide:
 *      - User Data  (username, email,moodle id ,etc)
 *      - User Posts (certifications and credyl badges)
 *      - User profile pic
 */
myprofileRoute.get("/myprofile",checkToken, async(req,res)=> {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {                // This part of code to trace the IP address to log it
        userIP = userIP[0];                     //
    } else if (userIP.includes(',')) {          // This important to keep chekc if the it is deployed
        userIP = userIP.split(',')[0].trim();   //
    }                                           //

    const token_username = await fetchUser(req,res); //fetching username

    try{
        const user_profile_data = await Profiles.find({username : token_username}); //pulling thier the posts
        const user_Data = await User.findOne({username : token_username});          //pulling their profile data
        logMessage(`[=] ${userIP} Mobileapp : pulled user data of ${token_username}`);
        res.render("profile",{certificateData : user_profile_data, userBio: user_Data, profilePic: "/uploads/${tokencheck.username}/profile.jpg",base_url :BASE_URL  });
    }
    catch (error){
        logMessage(`[*] Internal server error : ${error}`);
        res.status(500);
    }
});

module.exports = myprofileRoute;