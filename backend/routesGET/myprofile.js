const express =require('express');
const myprofileRoute = express.Router();
const jwt = require('jsonwebtoken');
require("dotenv").config();

const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger');
const {fetchUser} = require('../utils/fetchUser');

const CSRFToken = require('../models/csrfttoken')
const User = require('../models/users');
const Profiles = require('../models/profiles');

const BASE_URL = process.env.BASE_URL;
const serverSK = process.env.SERVER_SEC_KEY;

myprofileRoute.get("/myprofile",checkToken, async(req,res)=> {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const token_username = await fetchUser(req,res);

    try{
        const user_profile_data = await Profiles.find({username : token_username});
        const user_Data = await User.findOne({username : token_username});
        res.render("profile",{certificateData : user_profile_data, userBio: user_Data, profilePic: "/uploads/${tokencheck.username}/profile.jpg",base_url :BASE_URL  });
    }
    catch (error){
        logMessage(`[*] Internal server error : ${error}`);
        res.status(500);
    }
});

module.exports = myprofileRoute;