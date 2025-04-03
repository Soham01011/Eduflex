const express = require("express")
const maintestpageRoute = express.Router();

const Users = require('../models/users');

const { checkToken } = require('../middleware/checkToken');
const { logMessage } = require("../utils/logger");
const { fetchUser } = require("../utils/fetchUser");

maintestpageRoute.get("/alltest",checkToken, async(req,res)=> {
    const username = await fetchUser(req,res);
    let user_type = username.user_type;
    return res.status(200).render("maintestpage",{username,user_type});
});


module.exports = maintestpageRoute;