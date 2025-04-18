const express = require("express")
const maintestpageRoute = express.Router();

const Users = require('../models/users');
const Testsession = require('../models/psychometric');

const { checkToken } = require('../middleware/checkToken');
const { logMessage } = require("../utils/logger");
const { fetchUser } = require("../utils/fetchUser");


maintestpageRoute.get("/alltest", checkToken, async(req,res)=> {
    const username = await fetchUser(req,res);

    // Fetch only completed test sessions and extract username from test_id
    const completedTests = await Testsession.find({
        test_id: { $regex: `^${username}-` }, // Match test_ids that start with username-
        completed: true
    }).sort({ startedAt: -1 }).select("dimension startedAt");
    
    console.log(completedTests);

    let user_type = await Users.findOne({ username: username }).select("user_type");
    user_type = user_type.user_type;
    return res.status(200).render("maintestpage",{username,user_type,completedTests});
});


module.exports = maintestpageRoute;