const express = require("express")
const profilementorRoute = express.Router()

const {checkToken }= require("../middleware/checkToken");
const { checkUserType } = require("../middleware/checkUserType");
const {fetchUser} = require("../utils/fetchUser");

const User = require("../models/users")

profilementorRoute.get("/profile-web-page-mentor", checkToken, checkUserType , async(req,res)=> {
    const username = await fetchUser(req,res);
    const user = await User.findOne({"username" : username});
    res.render("mentorprofilepage",{user});
});

module.exports = profilementorRoute;