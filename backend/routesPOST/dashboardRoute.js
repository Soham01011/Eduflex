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
const Pointshistory = require("../models/pointshistory");
const { logMessage } = require('../utils/logger');


dashboardrouter.get("/dashboard",checkToken , async(req,res)=>{ //the checkToken will be exeuted first then the next request
    const username = await fetchUser(req,res); //returning the username
    try {
        const pointsData = await Pointshistory.find({"username": username}).select("post_type post_subtype points time")
    
        res.status(200).render('index', {
            username, 
            pointsData
        });
    } catch (error) {
        logMessage(`[*] Error fetching dashboard : ${error}`);
        res.status(500).json({ "error": "Internal server error" });
    }    
});

module.exports = dashboardrouter // exporting the router as a module