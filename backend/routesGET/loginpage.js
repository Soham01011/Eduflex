const express = require('express')
const loginrouter = express.Router();

loginrouter.get("/loginpage", (req,res) =>{
    res.status(200).render("login")
});

module.exports = loginrouter