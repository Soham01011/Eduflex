const express = require("express")
const dashboardmentorRoute = express.Router();

const { fetchUser } = require("../utils/fetchUser");

dashboardmentorRoute.get("/dashboard-mentor",async(req,res)=> {
    const username = await fetchUser(req,res);
    res.render('dashboardmentor', { username });
});

module.exports = dashboardmentorRoute;