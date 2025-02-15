const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const User = require('../models/users');
const Mentor = require('../models/mentees');
const { logMessage } = require('./logger');

async function addMentees(userUsername, filename, batchname, selection, interface, userIP,timeslot) {
    const form = new FormData();
    const filePath = `/home/soham-dalvi/Projects/Eduflex/backend/hashtag_extractions/${filename}`;

    // Check if the file exists before attempting to process it
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        return;
    }

    // Append file and selection data to the form
    form.append('file', fs.createReadStream(filePath));
    form.append('selection', selection.toLowerCase());

    console.log("Initiating mentee addition process...");

    try {
        console.log("Uploading file...");

        // Post the form data to the server
        const response = await axios.post('http://localhost:5000/upload', form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        // Extract data from the server response
        const data = response.data.data || [];
        console.log('Extracted Data:', data);

        const mentorStudents = [];
        const mentorStudentsMoodle = [];

        // Process each name in the response data
        for (const name of data) {
            const parts = name.split(' ');

            if (parts.length >= 2) {
                const firstname = parts[0].toLowerCase();
                const lastname = parts[1].toLowerCase();

                // Search for the user in the database
                const userExists = await User.findOne({
                    $or: [
                        { firstname: new RegExp(`^${firstname}$`, 'i'), lastname: new RegExp(`^${lastname}$`, 'i') },
                        { firstname: new RegExp(`^${lastname}$`, 'i'), lastname: new RegExp(`^${firstname}$`, 'i') },
                    ],
                });

                if (userExists) {
                    mentorStudents.push(name); // Add full name
                    mentorStudentsMoodle.push(userExists.username); // Add username
                }
            }
        }

        // Add or update mentees for the mentor batch
        if (mentorStudents.length > 0) {
            const existingBatch = await Mentor.findOne({ batch: batchname });

            if (existingBatch) {
                // Add unique mentees to the existing batch
                const uniqueStudents = new Set([...existingBatch.students, ...mentorStudents]);
                existingBatch.students = Array.from(uniqueStudents);
                await existingBatch.save();

                console.log('Mentees updated successfully.');
                logMessage(`[=] ${interface} ${userIP} : Mentees updated for mentor ${userUsername} in batch ${batchname}`);
            } else {
                // Create a new batch
                const newMentees = new Mentor({
                    mentor: userUsername,
                    students: mentorStudents,
                    username: mentorStudentsMoodle,
                    batch: batchname,
                    timings : timeslot
                });
                await newMentees.save();

                console.log('Mentees added successfully.');
                logMessage(`[=] ${interface} ${userIP} : Mentees added for mentor ${userUsername} in new batch ${batchname}`);
            }
        } else {
            console.log('No valid mentees found to add.');
            logMessage(`[!] ${interface} ${userIP} : No valid mentees found for mentor ${userUsername}`);
        }
    } catch (error) {
        console.error('Error processing mentees:', error);
        logMessage(`[X] ${interface} ${userIP} : Error processing mentees for mentor ${userUsername}: ${error.message}`);
    }
}

module.exports = { addMentees };
