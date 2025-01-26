const express = require("express")
const psychometrictestpage = express.Router();

const { checkToken } = require("../middleware/checkToken")
const { logMessage } = require("../utils/logger");
const { fetchUser } = require("../utils/fetchUser");

psychometrictestpage.get("/psychometrictestpage", checkToken , async(req, res)=> {

    return res.status(200).render("psychometrictestpage")

});

module.exports = psychometrictestpage