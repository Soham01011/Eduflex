/**
 * This is the login route which can be used by the mobileapp and the web app
 */
const expres = require('express');
const loginLogicRouter = expres.Router();
const jwt = require('jsonwebtoken');
require("dotenv").config();
const { v4: uuidv4, stringify } = require("uuid");

/**
 *
 * logMessage         : A minimal function which logs all the requests to the server make sure 
 *                      to understand the format of the logs and do log all the erros and user
 *                      activities. This can be useflu for further studies. 
 * fetchAndSaveBadges : A async function which will pull the users credly badges on the login
 *                      This async function make api call on the python server to pull data 
 *                      and save automatically. further for more understanding check 
 *                      fetchAndSavebadges in the utils.
 */
const {logMessage} = require('../utils/logger');
let { fetchAndSaveBadges } = require('../utils/fetchAndSaveBadges');

/**
 * Below is the code to have manual feature enabling and disabling commands to make it scalable 
 * they have to set in the env file . BY DEFAULT IT WILL WORK IF NOT SET AS FALSE
 */

if(process.env.USE_PYTHON_SERVER==='false'){
    fetchAndSaveBadges =null; 
}

if(process.env.USE_CREDLY_BADGES === 'false'){
    fetchAndSaveBadges = null;
}


const User = require('../models/users');
const Credly = require("../models/credly");
const CSRFToken = require('../models/csrfttoken');


const serverSK = process.env.SERVER_SEC_KEY;

loginLogicRouter.post("/login", async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    
    const { userUsername, userPwd, mobiletoken, interface } = req.body; 
    // Set the interface to "Webapp" if it is not provided
    const interfaceType = interface || "Webapp"; 
    console.log(userUsername, userPwd, mobiletoken, interfaceType);

    if (userUsername) {    
        logMessage(`[=] User ${userUsername} attempting to log in`);
    }

    try {
        // Use interfaceType instead of interface in your existing conditions
        if (interfaceType === "Webapp") {

            const user = await User.findOne({ username: userUsername });

            if (!user || user.password !== userPwd) {
                logMessage(`[-] ${interfaceType} ${userIP} : Unsuccessful login attempt for user ${userUsername}`);
                return res.status(401).json({ message: "Invalid username or password" });
            }

            logMessage(`[=] ${interfaceType} ${userIP} : User ${userUsername} successfully logged in`);

            const uniqueId = uuidv4();

            // Include userId, username, and interface in the payload
            const payload = jwt.sign({
                userId: uniqueId,       // Unique ID for the token
                username: userUsername, // Username of the user
                interface: "Webapp"     // Interface type (Webapp or Mobileapp)
            }, serverSK, { expiresIn: "15m" });
            
            const check_token_DB = await CSRFToken.findOne({ username: userUsername });
            if (check_token_DB) {
                await CSRFToken.deleteOne({ username: userUsername });
            }
            
            logMessage(`[=] ${interfaceType} ${userIP} : Token provided for user ${userUsername}`);
            
            // Save the token data in the CSRFToken collection
            const token_Data = new CSRFToken({
                token: uniqueId,         // Use uniqueId as the token in the database
                username: userUsername,  // Save the username
                interface: "Webapp"      // Save the interface type
            });
            await token_Data.save();
            
            // Send the JWT as a cookie
            res.cookie("Token", payload, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if serving over HTTPS
                maxAge: 15 * 60 * 1000 // 15 minutes
            });
            if(await Credly.findOne({username : userUsername}))
            {
                if(fetchAndSaveBadges){
                    fetchAndSaveBadges(userUsername);
                }
                else{
                    console.log('[INFO] * Credly system is disabled , enable it in env file')
                }
            }
            const userProfile = await User.findOne({ username: userUsername });
            const mandatoryFields = [
                'firstname',
                'lastname',
                'phone_number',
                'dob',
                'bio',
                'college',
                'academic_year',
                'semester',
                'cgpa',
                'hobby',
            ];

            // Check for missing mandatory fields
            const missingFields = mandatoryFields.filter(field => !userProfile[field]);

            if (missingFields.length > 0) {
                console.log("Going to profile page")
                return res.redirect('/profile-web-page');
            } else {
                console.log("Going to dash page")
                return res.redirect('/dashboard');
            }

        } 
        else if (interfaceType === "Mobileapp" && typeof mobiletoken === 'string') {
            console.log("Mobile app auto-login block");

            const mobile_token_check = await CSRFToken.findOne({ token: mobiletoken });
            
            if (!mobile_token_check) {
                console.log("Mobile token not found");
                return res.status(401).json({ message: "No token found" });
            }

            const user = await User.findOne({ username: mobile_token_check.username });
            const tokenAge = (Date.now() - mobile_token_check.createdAt) / (1000 * 60 * 60 * 24);
            
            if (tokenAge > 30) {
                console.log("Token expired");
                logMessage(`[=] Mobileapp ${userIP} : Token for user ${mobile_token_check.username} has expired`);
                await CSRFToken.deleteOne({ token: mobile_token_check.token });
                return res.status(400).json({ message: "expired" });
            }

            fetchAndSaveBadges(mobile_token_check.username);
            logMessage(`[=] Mobileapp ${userIP} : Token for user ${mobile_token_check.username} is valid`);
            console.log("Token found and is valid");

            return res.status(200).json({ message: "valid", user_type: user.user_type });
        } 
        else if (interfaceType === "Mobileapp" && !mobiletoken) {
            console.log("Mobile app login with username and password");

            const user = await User.findOne({ username: userUsername });

            if (!user || user.password !== userPwd) {
                logMessage(`[-] ${interfaceType} ${userIP} : Unsuccessful login attempt for user ${userUsername}`);
                return res.status(401).json({ message: "Invalid username or password" });
            }

            logMessage(`[=] ${interfaceType} ${userIP} : User ${userUsername} successfully logged in`);

            const uniqueId = uuidv4();
            const payload = jwt.sign({ userId: uniqueId }, serverSK, { expiresIn: "15m" });

            const check_token_DB = await CSRFToken.findOne({ username: userUsername });
            if (check_token_DB) {
                await CSRFToken.deleteOne({ username: userUsername });
            }

            logMessage(`[=] ${interfaceType} ${userIP} : Token provided for user ${userUsername}`);
            const LLT = uuidv4();
            const token_Data = new CSRFToken({
                token: LLT,
                username: userUsername,
                interface: "Mobileapp"
            });
            await token_Data.save();
            return res.status(200).json({ message: "Login successful", token: LLT, userType: user.user_type });
        } 
        else {
            console.log("No matching condition, fallback block");
            return res.status(400).json({ message: "Invalid request" });
        }

    } catch (error) {
        logMessage("[*] Database connection failed: " + error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = loginLogicRouter;