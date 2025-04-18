const express = require('express');
const likesRoute = express.Router();

const Likes = require('../models/likes');
const Posts = require('../models/profiles'); // Add Posts model

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

        // Find the post and likes document
        const [post, likeDoc] = await Promise.all([
            Posts.findOne({ postID }),
            Likes.findOne({ postID })
        ]);

        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }

        let isLiked = false;
        let likesCount = post.likes || 0;

        if (!likeDoc) {
            // First like for this post
            const newLikeDoc = new Likes({ postID, liked: [username] });
            await newLikeDoc.save();
            isLiked = true;
            likesCount += 1;
        } else {
            const userLikedIndex = likeDoc.liked.indexOf(username);
            if (userLikedIndex === -1) {
                // User hasn't liked - add like
                likeDoc.liked.push(username);
                isLiked = true;
                likesCount += 1;
            } else {
                // User already liked - remove like
                likeDoc.liked.splice(userLikedIndex, 1);
                isLiked = false;
                likesCount -= 1;
            }
            await likeDoc.save();
        }

        // Update post likes count
        await Posts.updateOne({ postID }, { likes: likesCount });

        res.status(200).json({ 
            success: true,
            isLiked,
            likesCount,
            message: isLiked ? "Post liked successfully." : "Post unliked successfully."
        });

    } catch (error) {
        logMessage(`Error liking post: ${error.message}`);
        res.status(500).json({ message: "An error occurred while liking the post." });
    }
});

module.exports = likesRoute;
