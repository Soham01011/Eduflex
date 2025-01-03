const express = require('express')
const skillexpeduRoute = express.Router();
const { v4: uuidv4, stringify } = require("uuid");

const Allskills = require('../models/expeduskill');

const {fetchUser} = require('../utils/fetchUser');
const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger');
const {interfaceFetch} = require('../utils/interface');

skillexpeduRoute.use(express.json());


skillexpeduRoute.get('/alldata/:username', async(req,res)=> {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const username = req.params.username; 
    let userskillData = await Allskills.findOne({username : username});
    if(userskillData){
        res.status(200).json({data: userskillData});
    }
    res.status(404).json({message : "User data not found"});

});

skillexpeduRoute.post('/', checkToken, async (req, res) => {
    console.log("HITTTTTT");
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log("BODY ",req.body.title , req.body.employmentType , req.body.start_date , req.body.end_date , req.body.companyName);
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    try {
        const experienceData = req.body;

        // Validate the input fields
        if (!experienceData.title || !experienceData.companyName || !experienceData.start_date || !experienceData.employmentType) {
            return res.status(400).json({ message: "Missing required fields in experience data" });
        }

        // Map input data to schema's expected format
        const formattedExperienceData = {
            id: uuidv4(),
            title: experienceData.title,
            companyName: experienceData.companyName,
            startTime: new Date(experienceData.start_date),
            endTime: experienceData.end_date ? new Date(experienceData.end_date) : null,
            employmentType: experienceData.employmentType
        };
        console.log(formattedExperienceData)
        const username = await fetchUser(req, res);
        const interface = await interfaceFetch(req, res);

        // Find the user by username
        let updateExp = await Allskills.findOne({ username });

        if (updateExp) {
            // Add the new experience to the array
            updateExp.experience.push(formattedExperienceData);

            // Optional: Sort the experience array by startTime in descending order
            updateExp.experience.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

            await updateExp.save();

            logMessage(`[=] ${interface} ${userIP} : ${username} added new experience`);
            res.status(200).json({ message: "Experience updated successfully" });
        } else {
            // Create a new user with the provided experience
            const newUser = new Allskills({
                id: uuidv4(),
                username,
                experience: [formattedExperienceData]
            });

            await newUser.save();

            logMessage(`[=] ${interface} ${userIP} : ${username} added new experience`);
            res.status(201).json({ message: "Experience added successfully" });
        }
    } catch (error) {
        console.error("Error adding experience:", error);
        res.status(500).json({ message: "Error adding experience" });
    }
});

skillexpeduRoute.delete('/:id',  async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const experienceId = req.params.id; // ID of the experience to delete
    const username = await fetchUser(req, res);
    const interface = await interfaceFetch(req, res);

    try {
        const user = await Allskills.findOne({ username });

        if (!user) {
            logMessage(`[!] ${interface} ${userIP} : User not found (${username})`);
            return res.status(404).json({ message: "User not found" });
        }

        // Find the experience by ID and remove it
        const experienceIndex = user.experience.findIndex(exp => exp.id === experienceId);

        if (experienceIndex === -1) {
            logMessage(`[!] ${interface} ${userIP} : Experience not found for ${username}`);
            return res.status(404).json({ message: "Experience not found" });
        }

        user.experience.splice(experienceIndex, 1); // Remove the experience
        await user.save();

        logMessage(`[=] ${interface} ${userIP} : ${username} deleted experience ${experienceId}`);
        res.status(200).json({ message: "Experience deleted successfully" });
    } catch (error) {
        logMessage(`[*] ${interface} ${userIP} : Error deleting experience for ${username}`);
        res.status(500).json({ message: "Error deleting experience", error: error.message });
    }
});

module.exports = skillexpeduRoute;