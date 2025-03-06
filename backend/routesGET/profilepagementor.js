const express = require("express")
const profilementorRoute = express.Router()

const {fetchUser} = require("../utils/fetchUser");
const { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");

const User = require("../models/users");
const Mentees = require("../models/mentees");

profilementorRoute.get("/profile-web-page-mentor", checkTokenAndUserType , async(req,res)=> {
    const username = await fetchUser(req,res);
    const user = await User.findOne({"username" : username});
    const mentees = await Mentees.find({"mentor" : username});

    res.render("mentorprofilepage",{user,mentees});
});

module.exports = profilementorRoute;