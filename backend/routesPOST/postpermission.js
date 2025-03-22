const express = require("express")
const postpermissionRouter = express.Router();

let {fetchUser} = require('../utils/fetchUser');
let { logMessage } = require('../utils/logger');
let { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");

const Profiles = require("../models/profiles");
const Mentees = require("../models/mentees");
const Points = require("../models/pointshistory");
const { findOne } = require("../models/users");

postpermissionRouter.post("/postpermission-mentor", checkTokenAndUserType, async (req, res) => {
    try {
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }

        const { postID, accept } = req.body;
        console.log(postID ,accept)
        const username = await fetchUser(req, res);

        // Fetch student's username using postID
        const studentProfile = await Profiles.findOne({ postID: postID }).select("username");

        if (!studentProfile) {
            return res.status(404).json({ message: "No student with that post ID" });
        }

        const studentUsername = studentProfile.username;

        // Check if the student exists under the mentor's mentee list
        const isMentee = await Mentees.findOne({ mentor: username, username: studentUsername });

        if (!isMentee) {
            return res.status(403).json({ message: "You are not authorized to approve/reject this post" });
        }

        if (!accept) {
            // Reject post by updating status
            await Profiles.updateOne(
                { postID: postID },
                { $set: { approved: false, mentor_approved: false } }
            );
            return res.status(200).json({ message: "Post rejected successfully" });
        } else {
            // Accept post by updating status
            await Profiles.updateOne(
                { postID: postID },
                { $set: { approved: true, mentor_approved: true } }
            );
            return res.status(200).json({ message: "Post approved successfully" });
        }
    } catch (error) {
        console.error("Error in postpermission-mentor:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



module.exports = postpermissionRouter;