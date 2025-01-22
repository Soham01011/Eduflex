const express = require("express")
const myprofileLogicRoute = express.Router();
const fs = require('fs');

const CSRFToken = require('../models/csrfttoken')
const Profiles = require('../models/profiles')
const User = require('../models/users')
const Credly = require('../models/credly')

const {checkToken} = require('../middleware/checkToken')
const {logMessage} = require('../utils/logger')

myprofileLogicRoute.post("/myprofile",checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const { Token, interface } = req.body;
    const interfaceType = interface || "Webapp";
    const tokencheck = await CSRFToken.findOne({ token: Token });

    if (tokencheck) {
        try {
            const user_profile_data = await Profiles.find({ username: tokencheck.username });
            const user_credly_data = await Credly.find({ username: tokencheck.username });
            const user_bio_data = await User.find({username: tokencheck.username});
            const uploadDir = path.join(__dirname, "..", "uploads",  tokencheck.username);
            // Include the file paths for images
            const profilePosts = user_profile_data.map(post => {
                if (fs.existsSync(uploadDir)) {
                    const images = fs.readdirSync(uploadDir)
                        .filter(file => file.startsWith(path.basename(post.file, path.extname(post.file))) && file.endsWith('.jpg'))
                        .map(file => `/uploads/${post.username}/${file}`);
                    return {
                        ...post._doc,
                        images,
                        post_desc: post.post_desc
                    };
                }
                return post;
            });

            console.log(user_profile_data); 
            console.log("PROFILES",profilePosts); 

            logMessage(`[=] ${interfaceType} ${userIP} : ${tokencheck.username} pulled their own profile`);
            if(interfaceType === "Mobileapp"){
                res.status(200).json({ userbio : user_bio_data,data: profilePosts, credly: user_credly_data });
            }
            else
            {
                res.render("profile",{certificateData : profilePosts, userBio:user_bio_data, profilePic: "/uploads/${tokencheck.username}/profile.jpg" });
            }
        } catch (error) {
            logMessage(`[*] ${interfaceType} ${userIP} : Internal server error ${error}`);
            res.status(500).json({ message: "Internal server error" });
        }
    } else {
        res.status(400).json({ message: "Invalid Token" });
    }
});

module.exports = myprofileLogicRoute;