const express = require("express");
const AnnoucementRoute = express.Router();

const {logMessage} = require('../utils/logger'); 
const {fetchUser} = require('../utils/fetchUser');
const { checkToken } = require("../middleware/checkToken");
const {interfaceFetch} = require("../utils/interface");
const { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");

const Announcement = require("../models/announcements");
const User = require("../models/users");

// GET route for fetching announcements
AnnoucementRoute.get("/", checkToken, async(req, res) => {
    try {
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }
        let username = await fetchUser(req, res);
        let user_type = await User.findOne({ username: username }).select("user_type");
        user_type = user_type.user_type;

        // Fetch all announcements and sort by date (newest first)
        const announcements = await Announcement.find({})
            .sort({ date: -1 });

        // Add isRegistered field to each announcement
        const processedAnnouncements = announcements.map(announcement => {
            const isRegistered = announcement.registeredusers.includes(username);
            return {
                ...announcement.toObject(),
                isRegistered
            };
        });

        // Return announcements with registration status
        res.render('announcement', {
            announcements: processedAnnouncements,
            username: username,
            user_type
        });

    } catch (error) {
        logMessage('error', `Error fetching announcements: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Error fetching announcements",
            error: error.message
        });
    }
});

// POST route for event registration
AnnoucementRoute.post("/register", checkTokenAndUserType, async(req, res) => {
    try {
        const eventId = req.body.eventId;
        const username = await fetchUser(req, res);
        const interface = await interfaceFetch(req, res);
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (await User.findOne({ username: username }).select("user_type") === "Mentor") {
            return res.status(403).json({
                success: false,
                message: "Mentors cannot register for events"
            });
        }

        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }

        // Find the announcement
        const announcement = await Announcement.findOne({ id: eventId });
        
        if (!announcement) {
            logMessage('error', `Event registration failed: Event ${eventId} not found for user ${username} from ${userIP}`);
            return res.status(404).json({
                success: false,
                message: "Event not found"
            });
        }

        // Check if user is already registered
        if (announcement.registeredusers.includes(username)) {
            logMessage('info', `User ${username} attempted to register again for event ${eventId} from ${userIP}`);
            return res.status(400).json({
                success: false,
                message: "You are already registered for this event"
            });
        }

        // Add user to registered users array
        announcement.registeredusers.push(username);
        await announcement.save();

        logMessage(`[=] ${interface} ${userIP} : User ${username} successfully registered for event ${eventId}.`);

        res.status(200).json({
            success: true,
            message: "Successfully registered for the event"
        });

    } catch (error) {
        logMessage('error', `Event registration error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Error registering for event",
            error: error.message
        });
    }
});

module.exports = AnnoucementRoute;
