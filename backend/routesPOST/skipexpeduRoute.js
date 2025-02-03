const express = require('express')
const skillexpeduRoute = express.Router();
const { v4: uuidv4, stringify } = require("uuid");

const Allskills = require('../models/expeduskill');

const {fetchUser} = require('../utils/fetchUser');
const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger');
const {interfaceFetch} = require('../utils/interface');

skillexpeduRoute.use(express.json()); 
skillexpeduRoute.use(express.urlencoded({ extended: true }));


skillexpeduRoute.get('/alldata/:username', async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log("HITTT ALL DATA")
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const username = req.params.username || await fetchUser(req, res); 
    console.log("GET ALL DATA:", username);

    try {
        let userskillData = await Allskills.findOne({ username: username });

        if (userskillData) {
            res.status(200).json({ data: userskillData });
        } else {
            res.status(404).json({ message: "User data not found" });
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Error fetching user data" });
    }
});


skillexpeduRoute.post('/', checkToken, async (req, res) => {
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

skillexpeduRoute.delete('/experience/:id', checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    
    const experienceId = req.params.id; // ID of the experience to delete
    const username = await fetchUser(req, res);

    try {
        const user = await Allskills.findOne({ username });

        if (!user) {
            logMessage(`[!] ${userIP} : User not found (${username})`);
            return res.status(404).json({ message: "User not found" });
        }

        // Find the experience by ID and remove it
        const experienceIndex = user.experience.findIndex(exp => exp.id === experienceId);
        if (experienceIndex === -1) {
            logMessage(`[!] ${userIP} : Experience not found for ${username}`);
            return res.status(404).json({ message: "Experience not found" });
        }

        user.experience.splice(experienceIndex, 1); // Remove the experience
        await user.save();

        logMessage(`[=] ${userIP} : ${username} deleted experience ${experienceId}`);
        res.status(200).json({ message: "Experience deleted successfully" });
    } catch (error) {
        logMessage(`[*] ${userIP} : Error deleting experience for ${username}`);
        res.status(500).json({ message: "Error deleting experience", error: error.message });
    }
});

skillexpeduRoute.post('/education', checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const username = await fetchUser(req, res);
    const interface = await interfaceFetch(req,res);

    // Extract data from the request body
    const { institute, degree, major_minor, startTime, endTime } = req.body;

    // Validate required fields
    if (!institute || !degree || !startTime) {
        return res.status(400).json({ message: "All required fields must be filled" });
    }

    try {
        // Find the user document
        const user = await Allskills.findOne({ username });

        if (!user) {
            logMessage(`[!] ${interface} ${userIP} : User not found (${username})`);
            return res.status(404).json({ message: "User not found" });
        }

        // Create a new education entry
        const newEducation = {
            id: uuidv4(), // Generate a unique ID
            institute,
            degree,
            major_minor,
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : null, // Allow endTime to be optional
        };

        // Add the new education entry to the education array
        user.education.push(newEducation);

        // Save the updated user document
        await user.save();

        logMessage(`[=] ${interface} ${userIP} : ${username} added education ${newEducation.id}`);
        res.redirect('/profile-web-page')
    } catch (error) {
        logMessage(`[*] ${interface} ${userIP} : Error adding education for ${username}`);
        res.status(500).json({ message: "Error adding education", error: error.message });
    }
});

skillexpeduRoute.delete('/education/:id' , checkToken , async(req,res)=> {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const username = await fetchUser(req, res);
    const interface = await interfaceFetch(req,res);

    const educationID = req.params.id; 

    try {
        const user = await Allskills.findOne({ username });

        if (!user) {
            logMessage(`[!] ${userIP} : User not found (${username})`);
            return res.status(404).json({ message: "User not found" });
        }

        // Find the experience by ID and remove it
        const educationIndex = user.education.findIndex(edu => edu.id === educationID);
        if (educationIndex === -1) {
            logMessage(`[!] ${userIP} : Experience not found for ${username}`);
            return res.status(404).json({ message: "Experience not found" });
        }

        user.education.splice(educationIndex, 1); // Remove the experience
        await user.save();

        logMessage(`[=] ${userIP} : ${username} deleted experience ${educationID}`);
        res.status(200).json({ message: "Experience deleted successfully" });
    } catch (error) {
        logMessage(`[*] ${userIP} : Error deleting experience for ${username}`);
        res.status(500).json({ message: "Error deleting experience", error: error.message });
    }

});

skillexpeduRoute.post("/project", checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const username = await fetchUser(req, res);
    const interface = await interfaceFetch(req,res);

    try {
        const {  title, description, url } = req.body;
        console.log(url)
        const id = uuidv4()
        if ( !title || !description ) {
            return res.status(400).json({ message: "Fields: title, description are required" });
        }

        // Check if the user exists, if not create a new entry
        const user = await Allskills.findOne({ username });
        if (!user) {
            const newUser = new Allskills({
                username,
                projects: [{ id, title, description, url }]
            });
            await newUser.save();
            logMessage(`[*] ${userIP} ${interface} : ${username} created a new profile and added a project with ID ${id}`);
            return res.status(201).json({ message: "User and project created successfully", user: newUser });
        }

        // Update the existing user's projects array
        const updatedUser = await Allskills.findOneAndUpdate(
            { username },
            { $push: { projects: { id, title, description, url } } },
            { new: true }
        );

        logMessage(`[*] ${userIP} ${interface} : ${username} added a new project with ID ${id}`);
        res.redirect('/profile-web-page');
    } catch (error) {
        logMessage(`[*] ${userIP} ${interface} : ${username} error adding project ${error}`);
        res.status(500).json({ message: "Error adding project" });
    }
});

// DELETE route to remove a project by ID
skillexpeduRoute.delete("/project/:id", checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const username = await fetchUser(req, res);
    const { id } = req.params;
    const interface = await interfaceFetch(req,res);

    try {
        if (!id) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        // Find the user by username and remove the project with the given ID
        const updatedUser = await Allskills.findOneAndUpdate(
            { username },
            { $pull: { projects: { id } } },
            { new: true }
        );

        if (!updatedUser) {
            logMessage(`[*] ${userIP} ${interface} : ${username} tried to delete a project, but user not found`);
            return res.status(404).json({ message: "User not found" });
        }

        logMessage(`[*] ${userIP} ${interface} : ${username} deleted project with ID ${id}`);
        res.status(200).json({ message: "Project deleted successfully"});
    } catch (error) {
        logMessage(`[*] ${userIP} ${interface} : ${username} error deleting project ${error}`);
        res.status(500).json({ message: "Error deleting project" });
    }
});

skillexpeduRoute.post("/skills", checkToken , async(req,res)=> {
    try {
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }

        const username = await fetchUser(req, res);
        const interface = await interfaceFetch(req, res);
        const data = req.body;

        if (!data.skills_input || !data.skill_type) {
            return res.status(400).json({ error: "Missing required skill data." });
        }   
        console.log(data)

        // Generate new skill object
        const newSkill = {
            id: data.id || `${username}-${uuidv4()}`, // Use provided id or generate new one
            skill_type: data.skill_type,
            name: data.skills_input,
            linked: !!data.id, // true if id is provided, false otherwise
        };

        // Update user skills array using $push
        const updatedUser = await Allskills.findOneAndUpdate(
            { username }, // Find user by username
            { $push: { skills: newSkill } }, // Push new skill into skills array
            { new: true } // Return the updated document
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found." });
        }
        logMessage(`${userIP} ${interface} : ${username} added new skill`)
        return res.status(200).redirect('/profile-web-page');
    } catch (error) {
        logMessage(`[*] Internal Server Error : ${error}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }

});

skillexpeduRoute.post("/skills/:id",checkToken, async(req,res) => {
    try{
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }
        const username = await fetchUser(req,res);
        const interface = await interfaceFetch(req,res);
        const id = req.params.id;

        if(!id){
            return res.status(400).json({meesage : "No id provided"})
        }

        const updatedUser = await Allskills.findOneAndUpdate(
            { username },
            { $pull: { skills: { id } } },
            { new: true }
        );
        if (!updatedUser) {
            logMessage(`[-] ${userIP} ${interface} : ${username} tried to delete a Skill, but user not found`);
            return res.status(404).json({ message: "User not found" });
        }

        logMessage(`[=] ${userIP} ${interface} : ${username} deleted skill with ID ${id}`);
        res.status(200).redirect('/profile-web-page');
    }
    catch(err){
        logMessage(`[*] Internal Server Error : ${err}`);
        res.status(500).json({message: "Internal Server ERROR "});
    }
});

module.exports = skillexpeduRoute;