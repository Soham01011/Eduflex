const express = require("express")
const makeannouncements = express.Router();

const { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");

makeannouncements.get("/makeannoucement",async(req,res)=>{

    res.render("uploadannouncement")

});

module.exports= makeannouncements;