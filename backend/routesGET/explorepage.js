const express = require('express')
const explorepageRoute = express.Router();

const Profiles = require('../models/profiles')
const Likes = require("../models/likes")
const {fetchUser} = require('../utils/fetchUser')

explorepageRoute.get("/explore", async (req, res) => {
    try {
        const page = 1; // First page
        const range = 5; // Number of posts per page
        
        // Fetch username with error handling
        let username;
        try {
            username = await fetchUser(req, res);
        } catch (error) {
            console.log("User fetch error:", error);
            username = "guest";
        }

        // If username is null, undefined, or empty string, set to static
        if (!username) {
            username = "guest";
        }

        // Fetch the latest posts with required fields
        const cards = await Profiles.find()
            .select('firstname lastname username post_desc file hashtags postID')
            .sort({ createdAt: -1 })
            .skip((page - 1) * range)
            .limit(range);

        if (!cards) {
            return res.status(200).render('explore', { 
                cards: [], 
                user_type: username 
            });
        }

        // Extract all postIDs from the cards
        const postIDs = cards.map(card => card.postID);
        const likesData = await Likes.find({ postID: { $in: postIDs } });

        const likesMap = {};
        likesData.forEach(like => {
            if (like && like.postID) {
                likesMap[like.postID] = like.liked ? like.liked.length : 0;
            }
        });

        // Attach likes count to each card, with null checks
        const updatedCards = cards.map(card => ({
            ...card.toObject(),
            likes: card.postID ? (likesMap[card.postID] || 0) : 0
        }));

        return res.status(200).render('explore', { 
            cards: updatedCards, 
            user_type: username 
        });

    } catch (error) {
        console.error("Error fetching explore data:", error);
        // Render the page with empty data rather than sending error
        return res.status(200).render('explore', { 
            cards: [], 
            user_type: "guest",
            error: "An error occurred while fetching data."
        });
    }
});

module.exports = explorepageRoute;