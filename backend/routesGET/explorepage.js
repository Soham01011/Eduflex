const express = require('express')
const explorepageRoute = express.Router();

const {fetchUser} = require('../utils/fetchUser');
 /**
  * This is a basic feed page where user can see recently uploaded posts as feed
  */

const Profiles = require("../models/profiles");

explorepageRoute.get("/explore",async(req,res)=> {

    const username = await fetchUser(req,res);


    const page = 1; // First page
    const range = 5; // Number of posts per page

    // Fetch the latest 5 records by sorting in descending order based on 'createdAt'
    const cards = await Profiles.find()
        .select('firstname lastname username post_desc file hashtags')
        .sort({ createdAt: -1 }) // Sort by 'createdAt' field in descending order
        .skip(0) // Skip 0 records for the first page
        .limit(range); // Limit to 'range' posts

    res.status(200).render('explore', { cards ,username} )
});

module.exports = explorepageRoute;