const express = require('express')
const leaderboardroute = express.Router();
const pointshistory = require("../models/pointshistory");
const User = require("../models/users");
const { logMessage } = require("../utils/logger")

leaderboardroute.get("/api", async (req, res) => {
    try {
        // Get all points history data
        const pointsData = await pointshistory.find({}).lean();
        
        // Get unique usernames from points history
        const activeUsernames = [...new Set(pointsData.map(point => point.username))];
        
        // Get only users who have points
        const users = await User.find(
            { username: { $in: activeUsernames } }, 
            'username firstname lastname department'
        ).lean();
        
        const usersMap = users.reduce((acc, user) => {
            acc[user.username] = user;
            return acc;
        }, {});

        // Get unique post types and subtypes
        const types = await pointshistory.distinct('post_type');
        const subtypes = await pointshistory.distinct('post_subtype');


        res.json({
            pointsData: pointsData,
            users: usersMap,
            types: types,
            subtypes: subtypes
        });

    } catch (err) {
        console.error(err);
        logMessage(`[*] Internal Server Error: ${err}`);
        res.status(500).json({ error: "Error fetching leaderboard data" });
    }
});

// Route to serve the leaderboard page
leaderboardroute.get("/", async(req, res) => {
    try {
        // Await the fetchUser promise
        const username = await fetchUser(req, res);
        
        if (username === 'guest') {
            return res.render("leaderboard", {
                username: 'guest',
                user_type: 'guest'
            });
        }

        // Find user type only if username is not guest
        const userDoc = await User.findOne({ username }).select("user_type");
        const user_type = userDoc ? userDoc.user_type : 'guest';

        res.render("leaderboard", {
            username,
            user_type
        });

    } catch (error) {
        logMessage(`[*] Error in leaderboard route: ${error}`);
        res.render("leaderboard", {
            username: 'guest',
            user_type: 'guest'
        });
    }
});

module.exports = leaderboardroute;