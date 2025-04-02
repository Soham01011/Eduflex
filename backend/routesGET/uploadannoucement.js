const express = require("express")
const makeannouncements = express.Router();

const { checkToken } = require("../middleware/checkToken");
const {fetchUser} = require("../utils/fetchUser");
const Announcements = require("../models/announcements");

makeannouncements.get("/makeannoucement", checkToken, async(req,res) => {
    try {
        const username = await fetchUser(req,res);
        const userAnnouncements = await Announcements.find({creator: username})
            .sort({ date: -1 }) // Sort by date descending (newest first)
            .lean(); // Convert to plain JavaScript objects
        console.log(userAnnouncements)
        res.render("uploadannouncement", { announcements: userAnnouncements,username });
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).send("Error fetching announcements");
    }
});

module.exports = makeannouncements;