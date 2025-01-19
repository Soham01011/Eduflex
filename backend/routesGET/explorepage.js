const express = require('express')
const explorepageRoute = express.Router();

const {fetchUser} = require('../utils/fetchUser');
 /**
  * This is a basic feed page where user can see recently uploaded posts as feed
  */

<<<<<<< HEAD
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
=======
const Profiles = require('../models/profiles')
const Likes = require("../models/likes")

explorepageRoute.get("/explore", async (req, res) => {
    try {
        const username = await fetchUser(req, res);

        const page = 1; // First page
        const range = 5; // Number of posts per page

        // Fetch the latest posts with required fields
        const cards = await Profiles.find()
            .select('firstname lastname username post_desc file hashtags postID')
            .sort({ createdAt: -1 }) // Sort by 'createdAt' field in descending order
            .skip((page - 1) * range) // Skip based on the page
            .limit(range); // Limit to 'range' posts

        // Extract all postIDs from the cards
        const postIDs = cards.map(card => card.postID);

        // Fetch likes for the posts in the current range
        const likesData = await Likes.find({ postID: { $in: postIDs } });

        // Create a map of postID to likes count
        const likesMap = {};
        likesData.forEach(like => {
            likesMap[like.postID] = like.liked.length;
        });

        // Attach likes count to each card, defaulting to 0 if no likes found
        const updatedCards = cards.map(card => ({
            ...card.toObject(),
            likes: likesMap[card.postID] || 0
        }));

        // Render the page with the updated cards
        res.status(200).render('explore', { cards: updatedCards, username });
    } catch (error) {
        console.error("Error fetching explore data:", error);
        res.status(500).send("An error occurred while fetching data.");
    }
>>>>>>> fa749ab9f4dc18f64c8a45dceb1d671ff566a12c
});

module.exports = explorepageRoute;