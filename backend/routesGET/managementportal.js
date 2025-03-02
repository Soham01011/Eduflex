const express = require("express")
const managementProtal = express.Router()

const {fetchUser} = require("../utils/fetchUser");
const { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");

const User = require("../models/users");

managementProtal.get("/management-portal-mentor", checkTokenAndUserType, async(req,res)=> {
    res.render("managementprotal")
});

module.exports = managementProtal;