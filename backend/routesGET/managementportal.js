const express = require("express")
const managementProtal = express.Router()

const {fetchUser} = require("../utils/fetchUser");
const { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");

const Mentees = require("../models/mentees");
const Profiles = require("../models/profiles");

managementProtal.get("/management-portal-mentor", checkTokenAndUserType, async(req,res)=> {
    const username = await fetchUser(req,res);
    const mentees = await Mentees.find({"mentor" : username});
    const menteesUsername = mentees.flatMap(mentee => mentee.username); 
    const students_uploads = await  Profiles.find({username: { $in : menteesUsername}})
    console.log(menteesUsername, mentees,students_uploads)
    res.render("managementprotal",{username, mentees,students_uploads})
});

module.exports = managementProtal;