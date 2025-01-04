const express = require('express')
const leaderboardroute = express.Router();

leaderboardroute.get("/leaderboard", (req,res) => {
    res.render('leaderboard');
});

module.exports = leaderboardroute;