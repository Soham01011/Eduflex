const express = require("express")
const postpermissionRouter = express.Router();
const fs = require("fs");
const path = require("path");

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
        console.log("Mentor decision:", postID, accept);
        const username = await fetchUser(req, res);

        // Fetch student's profile and check mentee status
        const studentProfile = await Profiles.findOne({ postID: postID }).select("username filename");
        if (!studentProfile) {
            return res.status(404).json({ message: "No student with that post ID" });
        }

        const studentUsername = studentProfile.username;
        const isMentee = await Mentees.findOne({ mentor: username, username: studentUsername });
        if (!isMentee) {
            return res.status(403).json({ message: "You are not authorized to approve/reject this post" });
        }

        // Update RLHF data based on mentor's decision
        const rlhfPath = path.join(__dirname, '..', 'RLHF', 'predictions.jsonl');
        if (fs.existsSync(rlhfPath)) {
            const fileContent = fs.readFileSync(rlhfPath, 'utf8');
            const lines = fileContent.trim().split('\n');
            const updatedLines = [];
            let dataModified = false;

            for (const line of lines) {
                const entry = JSON.parse(line);
                if (entry.postID === postID) {
                    // Convert model's numerical prediction to accept/reject decision
                    const modelDecision = entry.model_data.prediction >= 0.5 ? "accept" : "reject";
                    const mentorDecision = accept ? "accept" : "reject";

                    if (modelDecision !== mentorDecision) {
                        // If they disagree, mark entry for training
                        entry.trained = false;
                        entry.mentor_decision = mentorDecision;
                        entry.model_decision = modelDecision;
                        entry.model_confidence = entry.model_data.prediction;
                        entry.disagreement_type = `Model ${modelDecision} but mentor ${mentorDecision}`;
                        updatedLines.push(JSON.stringify(entry));
                        dataModified = true;
                        
                        logMessage(`[+] Disagreement detected: ${entry.disagreement_type} for postID: ${postID}`);
                    }
                    // If they agree, skip this entry
                } else {
                    // Keep other entries unchanged
                    updatedLines.push(line);
                }
            }

            if (dataModified) {
                fs.writeFileSync(rlhfPath, updatedLines.join('\n') + '\n', 'utf8');
                logMessage(`[+] Updated RLHF data with disagreements for postID: ${postID}`);
            }
        }

        // Update post status in database
        await Profiles.updateOne(
            { postID: postID },
            { 
                $set: { 
                    approved: accept, 
                    mentor_approved: accept,
                    mentor_decision_time: new Date()
                } 
            }
        );

        logMessage(`[+] ${userIP} ${username} : Post ${postID} ${accept ? 'approved' : 'rejected'} by mentor`);
        return res.status(200).json({ 
            message: `Post ${accept ? 'approved' : 'rejected'} successfully` 
        });

    } catch (error) {
        console.error("Error in postpermission-mentor:", error);
        logMessage(`[*] Error in postpermission-mentor: ${error.message}`);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = postpermissionRouter;