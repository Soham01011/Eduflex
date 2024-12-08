const express = require('express')
const dashboardrouter = express.Router();

const {fetchUser} = require('../utils/fetchUser')
const {checkToken} = require('../middleware/checkToken')

const BASE_URL = process.env.BASE_URL;

dashboardrouter.get("/dashboard",checkToken , async(req,res)=>{
    const username = await fetchUser(req,res);
    res.status(200).render('index', {username : username ,base_url : BASE_URL})
});

module.exports = dashboardrouter