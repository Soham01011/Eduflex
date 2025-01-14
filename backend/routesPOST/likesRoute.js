const express = require('express');
const likesRoute = express.Router();

const Likes = require('../models/likes');

const { logMessage } = require('../utils/logger');
const { fetchUser } = require('../utils/fetchUser');
const { checkToken } = require("../middleware/checkToken");

// Like a post
likesRoute.post('/like', checkToken, async (req, res) => {
    const { postID } = req.body; // Get postID from the request body
    const username = await fetchUser(req,res); // Assuming checkToken middleware adds `user` object to `req`

    try {
        if (!postID) {
            return res.status(400).json({ message: "Post ID is required." });
        }

        // Find or create the Likes document for the given postID
        let likeDoc = await Likes.findOne({ postID });

        if (!likeDoc) {
            // If no document exists for the postID, create a new one
            likeDoc = new Likes({ postID, liked: [username] });
        } else {
            // If document exists, add the username to the liked array if not already present
            if (!likeDoc.liked.includes(username)) {
                likeDoc.liked.push(username);
                res.status(200).json({ message: "Post liked successfully." });
            } else {
                likeDoc.liked.pop(username);
                res.status(200).json({ message: "Post unliked successfully." });
            }
        }

        await likeDoc.save();
    } catch (error) {
        logMessage(`Error liking post: ${error.message}`);
        res.status(500).json({ message: "An error occurred while liking the post." });
    }
});

module.exports = likesRoute;
