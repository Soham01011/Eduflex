const express = require('express')
const explorepageRoute = express.Router();

 /**
  * This is a basic feed page where user can see recently uploaded posts as feed
  */

const Profiles = require('../models/profiles')
const Likes = require("../models/likes")
const {fetchUser} = require('../utils/fetchUser')
const Users = require('../models/users')

explorepageRoute.get("/explore", async (req, res) => {
    try {
        const page = 1;
        const range = 5;
        
        let username;
        let user_type = "guest"; // Default value

        try {
            username = await fetchUser(req, res);
        } catch (error) {
            console.log("User fetch error:", error);
            username = "guest";
        }

        if (!username) {
            username = "guest";
        }

        if(username !== "guest") {   
            const userDoc = await Users.findOne({username: username}).select("user_type");
            user_type = userDoc ? userDoc.user_type : "guest";
        }

        const cards = await Profiles.find()
            .select('firstname lastname username post_desc file hashtags postID')
            .sort({ createdAt: -1 })
            .skip((page - 1) * range)
            .limit(range);

        if (!cards) {
            return res.status(200).render('explore', { 
                cards: [], 
                username: username,
                user_type: user_type  // Added user_type
            });
        }

        const postIDs = cards.map(card => card.postID);
        const likesData = await Likes.find({ postID: { $in: postIDs } });

        const likesMap = {};
        likesData.forEach(like => {
            likesMap[like.postID] = like.liked.length;
        });

        const updatedCards = cards.map(card => ({
            ...card.toObject(),
            likes: likesMap[card.postID] || 0
        }));

        return res.status(200).render('explore', { 
            cards: updatedCards, 
            username: username,
            user_type: user_type  // Added user_type
        });

    } catch (error) {
        console.error("Error fetching explore data:", error);
        return res.status(200).render('explore', { 
            cards: [], 
            username: "guest",
            user_type: "guest",  // Added user_type
            error: "An error occurred while fetching data."
        });
    }
});

module.exports = explorepageRoute;