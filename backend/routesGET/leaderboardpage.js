const express = require('express')
const leaderboardroute = express.Router();

const pointshistory = require("../models/pointshistory");
const User = require("../models/users");

const { logMessage } = require("../utils/logger")

leaderboardroute.get("/leaderboard", async (req, res) => {
    try {
        // Function to aggregate data for a specific post_type
        const aggregateDataByPostType = async (postType) => {
            const data = await pointshistory.aggregate([
                { $match: { post_type: postType } }, // Filter by post_type
                {
                    $group: {
                        _id: "$username",
                        totalPoints: { $sum: "$points" },
                    },
                },
                { $sort: { totalPoints: -1 } }, // Sort by total points
            ]);

            // Enrich with user details
            return Promise.all(
                data.map(async (entry, index) => {
                    const user = await User.findOne({ username: entry._id });
                    return {
                        rank: index + 1,
                        firstname: user ? user.firstname : "Unknown",
                        lastname: user ? user.lastname : "",
                        department: user ? user.department : "Unknown",
                        points: entry.totalPoints,
                    };
                })
            );
        };

        // Aggregate data for each category
        const academicLeaderboard = await aggregateDataByPostType("academic");
        const extraLeaderboard = await aggregateDataByPostType("extra");
        const experienceLeaderboard = await aggregateDataByPostType("experience");


        // Render the leaderboard view with all three categories
        res.render("leaderboard", {
            academic: academicLeaderboard,
            extra: extraLeaderboard,
            experience: experienceLeaderboard,
        });
    } catch (err) {
        console.error(err);
        logMessage(`[*] Internal Server Error: ${err}`);
        res.status(500).send("Error fetching leaderboard data");
    }
});


module.exports = leaderboardroute;