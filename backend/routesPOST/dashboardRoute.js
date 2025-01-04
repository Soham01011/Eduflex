const express = require('express');
const dashboardrouter = express.Router(); // The router for the dashboard page

/**
 * fetchUser : A utility which you can use and fetch the username directly from the 
 *             cookie or the request body (To userstand its working open utils/fetchUser)
 * checkToken : Check the token given to the user in the session and also checks if 
 *              it is valid or invalid if not then user will be logged out and if 
 *              the token is incorrect then also the user will the redirected to
 *              loginpage (To understand working open middleware,checkToken)
 */
const {fetchUser} = require('../utils/fetchUser')
const {checkToken} = require('../middleware/checkToken')

const Profiles = require('../models/profiles');
const { logMessage } = require('../utils/logger');


dashboardrouter.get("/dashboard",checkToken , async(req,res)=>{ //the checkToken will be exeuted first then the next request
    const username = await fetchUser(req,res); //returning the username
    try {
        const page = 1; // First page
        const range = 5; // Number of posts per page
    
        // Fetch the latest 5 records by sorting in descending order based on 'createdAt'
        const cards = await Profiles.find()
            .select('firstname lastname username post_desc file hashtags')
            .sort({ createdAt: -1 }) // Sort by 'createdAt' field in descending order
            .skip(0) // Skip 0 records for the first page
            .limit(range); // Limit to 'range' posts
    
        res.status(200).render('index', {
            username: username, 
            cards
        });
    } catch (error) {
        logMessage(`[*] Error fetching dashboard : ${error}`);
        res.status(500).json({ "error": "Internal server error" });
    }    
});

module.exports = dashboardrouter // exporting the router as a module