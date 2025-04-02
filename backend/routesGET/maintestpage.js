const express = require("express")
const maintestpageRoute = express.Router();

const Users = require('../models/users');

const { checkToken } = require('../middleware/checkToken');
const { logMessage } = require("../utils/logger");
const { fetchUser } = require("../utils/fetchUser");

maintestpageRoute.get("/alltest",checkToken, async(req,res)=> {
    const username = await fetchUser(req,res);
    return res.status(200).render("maintestpage",{username})
});


module.exports = maintestpageRoute;