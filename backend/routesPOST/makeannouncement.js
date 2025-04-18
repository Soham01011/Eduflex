const express = require("express");
const makeannouncement = express.Router();
const Announcements = require("../models/announcements");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4, stringify } = require("uuid");
const Users = require("../models/users");

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
            const { title, description, date, speaker, venue, time, announcementId } = req.body;
            const username = await fetchUser(req, res);
            

            // Date validation
            const eventDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for comparison
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (eventDate < tomorrow) {
                return res.status(400).json({ 
                    message: "Event date must be at least one day in the future" 
                });
            }

            // If announcementId exists, update existing announcement
            if (announcementId) {
                const existingAnnouncement = await Announcements.findOne({
                    id: announcementId,
                    creator: username
                });

                if (!existingAnnouncement) {
                    return res.status(404).json({ message: "Announcement not found or unauthorized" });
                }

                // Update the announcement
                const updateData = {
                    title,
                    description,
                    date: eventDate,
                    speaker,
                    venue,
                    time
                };

                // Only update image if new one is uploaded
                if (req.file) {
                    updateData.posterimage = `/uploads/announcements/${req.file.filename}`;
                }

                await Announcements.findByIdAndUpdate(
                    existingAnnouncement._id,
                    updateData,
                    { new: true }
                );

                logMessage(`[+] ${userIP} ${username} : Announcement updated successfully`);
                return res.redirect("/makeannoucement");
            }
            const department = await Users.findOne({ username: username }).select("department");
            department = department.department;
            // If no announcementId, create new announcement
            const id = `${username}-${uuidv4()}`;
            const newAnnouncement = new Announcements({
                title,
                description,
                date: eventDate,
                speaker,
                venue,
                time,
                id,
                posterimage: req.file ? `/uploads/announcements/${req.file.filename}` : null,
                creator: username,
                department,
            });

            await newAnnouncement.save();

            logMessage(`[+] ${userIP} ${username} : Announcement created successfully`);
            return res.redirect("/makeannoucement");

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