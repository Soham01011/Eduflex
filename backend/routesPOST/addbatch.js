const express = require("express");
const addbatches = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");

const { fetchUser } = require("../utils/fetchUser");
const { checkToken } = require("../middleware/checkToken");
const { checkUserType } = require("../middleware/checkUserType");
let { addMentees } = require('../utils/mentees');
const { interfaceFetch } = require("../utils/interface");
const { logMessage } = require("../utils/logger");

// Define your server secret key from environment variables
const serverSK = process.env.SERVER_SK;

if (process.env.USE_ADD_MENTES === "false") {
    addMentees = false;
}

const hashtag_storage = multer.diskStorage({
    destination: (req, file, callback) => {
        // Use an absolute path to ensure you know where the files are stored
        const hashtagDir = path.join(__dirname, '..', 'hashtag_extractions');
        console.log("Creating/using directory:", hashtagDir);
        fs.mkdirSync(hashtagDir, { recursive: true });
        callback(null, hashtagDir);
    },
    filename: (req, file, callback) => {
        const token = req.cookies.Token;
        let username = '';

        if (token) {
            try {
                const decoded = jwt.verify(token, serverSK);
                if (decoded && decoded.userId) {
                    username = decoded.username;
                } else {
                    logMessage("Decoded data invalid in fetchUser util");
                    return callback(new Error("User authentication failed"));
                }
            } catch (err) {
                return callback(err);
            }
        } else if (req.body && req.body.username) {
            username = req.body.username;
        }

        if (!username) {
            return callback(new Error('Username not found'));
        }

        // Construct the new filename
        const newFilename = username + "-" + file.originalname;
        console.log("Saving file as:", newFilename);
        callback(null, newFilename);
    }
});

const extract_hashtag_folder = multer({ storage: hashtag_storage });

addbatches.post("/addbatch", checkToken, checkUserType, extract_hashtag_folder.single('file'), async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    try {
        const interfaceData = await interfaceFetch(req, res);
        const up_username = await fetchUser(req, res);
        
        // Log the file info from multer
        console.log("Uploaded file info:", req.file);
        
        // Extract additional fields from the request body
        const { post_desc, selection, timeslot } = req.body;
        
        console.log(
            "Username:", up_username,
            "Filename:", req.file ? req.body.file : "No file uploaded",
            "Post Desc:", post_desc,
            "Selection:", selection,
            "User IP:", userIP,
            "Interface Data:", interfaceData,
            "Timeslot:", timeslot
        );
        
        if (addMentees) {
            addMentees(up_username, req.body.file, post_desc, selection, userIP, interfaceData, timeslot);
        } else {
            console.log('[INFO] * Mentees part is disabled, enable it in env file.');
        }
        
        res.status(200).json({ message: "Batch added successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = addbatches;
