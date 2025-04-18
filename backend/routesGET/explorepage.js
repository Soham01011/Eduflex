const express = require('express')
const explorepageRoute = express.Router();

const Profiles = require('../models/profiles')
const Likes = require("../models/likes")
const {fetchUser} = require('../utils/fetchUser')
const User = require('../models/users')

explorepageRoute.get("/explore", async (req, res) => {
    try {
        const page = 1; // First page
        const range = 5; // Number of posts per page
        
        // Initialize default values for guest users
        let username = null;
        let user_type = "guest";

        try {
            // Attempt to fetch user details only if logged in
            username = await fetchUser(req, res);
            if (username) {
                const userDoc = await User.findOne({ username: username }).select("user_type");
                user_type = userDoc ? userDoc.user_type : "guest";
            }
        } catch (userError) {
            // If fetching user fails, continue as guest
            console.log("No logged in user, continuing as guest");
        }
        console.log("Username in explore route:", username);
        // Fetch the latest posts with required fields
        const cards = await Profiles.find()
            .select('firstname lastname username post_name file hashtags postID')
            .sort({ createdAt: -1 })
            .skip((page - 1) * range)
            .limit(range);

        if (!cards || cards.length === 0) {
            return res.status(200).render('explore', { 
                cards: [], 
                username,
                user_type
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
            username,
            user_type
        });

    } catch (error) {
        console.error("Error fetching explore data:", error);
        // Render the page with empty data rather than sending error
        return res.status(200).render('explore', { 
            cards: [], 
            username: null,
            user_type: "guest",
            error: "An error occurred while fetching data."
        });
    }
});

module.exports = explorepageRoute;