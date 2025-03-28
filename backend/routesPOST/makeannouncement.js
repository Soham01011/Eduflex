const express = require("express");
const makeannouncement = express.Router();
const Announcements = require("../models/announcements");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4, stringify } = require("uuid");

const { logMessage } = require("../utils/logger");
const { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");
const { fetchUser } = require("../utils/fetchUser");

// Configure multer for poster image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/announcements');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'poster-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'));
    }
});

makeannouncement.post("/make-announcement", 
    checkTokenAndUserType, 
    upload.single('posterimage'), 
    async (req, res) => {
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Normalize userIP
        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }

        try {
            const { title, description, date, speaker, venue, time } = req.body;
            const username = await fetchUser(req, res);

            const id = `${username}-${uuidv4()}`;

            const newAnnouncement = new Announcements({
                title,
                description,
                date,
                speaker,
                venue,
                time,
                id,
                posterimage: req.file ? `/uploads/announcements/${req.file.filename}` : null
            });

            await newAnnouncement.save();

            logMessage(`[+] ${userIP} ${username} : Announcement made successfully`);
            res.json({ 
                message: "From here the user will be redirected to self uploaded announcements, Devare implemented this part",
               
            });
        } catch (err) {
            logMessage(`[*] Internal server error : ${err}`);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

// Error handling middleware for multer
makeannouncement.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Max size is 5MB' });
        }
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

module.exports = makeannouncement;