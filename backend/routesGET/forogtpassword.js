const express = require("express")
const forgetpasswordRoute = express.Router();

forgetpasswordRoute.get("/forgotpassword",(req,res) => {
    return res.render("forogtpass");
});

module.exports = forgetpasswordRoute;