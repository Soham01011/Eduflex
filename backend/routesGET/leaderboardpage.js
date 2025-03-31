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

        console.log("Types:", types);
        console.log("Subtypes:", subtypes);
        console.log("users", usersMap)
        console.log("pointsData", pointsData)

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
leaderboardroute.get("/", (req, res) => {
    res.render("leaderboard");
});

module.exports = leaderboardroute;