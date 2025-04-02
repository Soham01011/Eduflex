const express = require("express")
const profilementorRoute = express.Router()

const {fetchUser} = require("../utils/fetchUser");
const { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");

const User = require("../models/users");
const Mentees = require("../models/mentees");
const Course = require("../models/coursescert");
const Profiles = require("../models/profiles");


profilementorRoute.get("/profile-web-page-mentor", checkTokenAndUserType , async(req,res)=> {
    const username = await fetchUser(req,res);
    const user = await User.findOne({"username" : username});
    const mentees = await Mentees.find({"mentor" : username});
    const teachercourses = await Course.find({"mentor": username});
    console.log(teachercourses)
    res.render("mentorprofilepage",{user,mentees,teachercourses,username});
});

module.exports = profilementorRoute;