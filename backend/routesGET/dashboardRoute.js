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

/**
 * BASE_URL : This is an env variable to provide your ngrok link and will be used in the 
 *            front-end to pull some local script to run or to display the user data 
 */
const BASE_URL = process.env.BASE_URL;

dashboardrouter.get("/dashboard",checkToken , async(req,res)=>{ //the checkToken will be exeuted first then the next request
    const username = await fetchUser(req,res); //returning the username
    res.status(200).render('index', {username : username ,base_url : BASE_URL}) //passing the username and baseurl to the front end to display dynamically
});

module.exports = dashboardrouter // exporting the router as a module