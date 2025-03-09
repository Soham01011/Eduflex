const express = require("express")
const AnnoucementRoute = express.Router();

const {logMessage} = require('../utils/logger'); 

const User = require("../models/users");

AnnoucementRoute.get("/announcements", async(req , res)=> {

    res.render("announcement")

});

module.exports = AnnoucementRoute;
