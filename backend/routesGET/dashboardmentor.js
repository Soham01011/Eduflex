const express = require("express")
const dashboardmentorRoute = express.Router();

dashboardmentorRoute.get("/dashboard-mentor",async(req,res)=> {
    res.render('dashboardmentor')
});

module.exports = dashboardmentorRoute;