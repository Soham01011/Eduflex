const express = require('express')
const loginrouter = express.Router();
/**
 * A basic loginpage route to display the login and registration page .
 * Creating the module to be imported into the server.js
 */
loginrouter.get("/loginpage", (req,res) =>{
    res.status(200).render("login")
});

module.exports = loginrouter