const express = require("express")
const makeannouncements = express.Router();

const { checkToken } = require("../middleware/checkToken");
const {fetchUser} = require("../utils/fetchUser");
const Announcements = require("../models/announcements");
const User = require("../models/users");

makeannouncements.get("/makeannoucement", checkToken, async(req,res) => {
    try {
        const username = await fetchUser(req,res);
        let user_type = await User.findOne({ username: username }).select("user_type");
        user_type = user_type.user_type;
        const userAnnouncements = await Announcements.find({creator: username})
            .sort({ date: -1 }) // Sort by date descending (newest first)
            .lean(); // Convert to plain JavaScript objects
        res.render("uploadannouncement", { announcements: userAnnouncements ,username,user_type});
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).send("Error fetching announcements");
    }
});

module.exports = makeannouncements;