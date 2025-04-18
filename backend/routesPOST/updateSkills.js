const express = require('express');
const scoreskillsRouter = express.Router();
const AllSkills = require('../models/expeduskill');
const Mentees = require('../models/mentees');
const Pointshistory = require('../models/pointshistory');

const { fetchUser } = require('../utils/fetchUser');
const { checkTokenAndUserType } = require('../middleware/checkTokenandUsertype');
const { logger } = require('../utils/logger');

scoreskillsRouter.post('/update-skill-scores-mentor', checkTokenAndUserType, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Normalize userIP
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    try {
        const { skillScores } = req.body;
        const mentorUsername = await fetchUser(req, res);

        // Get mentor's students
        const mentorBatches = await Mentees.find({ mentor: mentorUsername });
        const authorizedStudents = mentorBatches.flatMap(batch => batch.username);

        // Process each skill score
        for (const score of skillScores) {
            const { batchId, username, skillId, score: skillScore } = score;

            // Verify if student belongs to mentor
            if (!authorizedStudents.includes(username)) {
                continue; // Skip unauthorized students
            }

            // Get the skill details first
            const userSkills = await AllSkills.findOne({ 
                username: username,
                'skills.id': skillId 
            });
            
            // Find the specific skill in the skills array
            const skillDetails = userSkills?.skills?.find(skill => skill.id === skillId);

            // Update the skill score and set it as approved
            await AllSkills.updateOne(
                { 
                    username: username,
                    'skills.id': skillId 
                },
                { 
                    $set: {
                        'skills.$.approved': true
                    }
                }
            );

            // Record points in history with the skill name
            await Pointshistory.create({
                username: username,
                postID: skillId,
                post_type: 'extracurricular',
                post_subtype: skillDetails?.name || 'Unknown Skill',
                points: skillScore || 1,
                time: new Date()
            });
        }
        logger(`[=] ${userIP} Webapp :Skill scores updated successfully for ${skillScores.length} students by mentor ${mentorUsername}`);

        res.status(200).json({ message: 'Skill scores updated successfully' });
    } catch (error) {
        console.error('Error updating skill scores:', error);
        res.status(500).json({ error: 'Failed to update skill scores' });
    }
});

module.exports = scoreskillsRouter;