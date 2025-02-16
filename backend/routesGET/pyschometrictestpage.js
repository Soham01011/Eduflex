const express = require("express")
const psychometrictestpage = express.Router();

const { checkTokenAndUserType } = require('../middleware/checkTokenandUsertype');
const { logMessage } = require("../utils/logger");
const { fetchUser } = require("../utils/fetchUser");

psychometrictestpage.get("/psychometrictestpage", checkTokenAndUserType , async(req, res)=> {

    return res.status(200).render("psychometrictestpage")

});

module.exports = psychometrictestpage