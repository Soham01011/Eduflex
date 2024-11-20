const fs = require('fs');
const axis = require('axios');
const User = require('../models/users')
const Mentor = require('../models/mentees')
const {logMessage} = require('./logger')

async function addMentees(userUsername, filename, batchname, selection, interface, userIP) {
    const form = new FormData();
    const filePath = `C:/Eduflex/backend/uploads/${userUsername}/${filename}`;
    form.append('file', fs.createReadStream(filePath));
    form.append('selection', selection.toLowerCase());

    console.log(" here in async function");

    try {
        console.log("Uploading file...");

        // Post the form data to your endpoint
        const response = await axios.post('http://localhost:5000/upload', form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        // Extracting data from the response
        const data = response.data.data;
        console.log('Extracted Data:', data);

        const mentorStudents = [];
        const mentorStudentsMoodle = [];

        for (const name of data) {
            const parts = name.split(' ');

            if (parts.length >= 2) {
                const firstname = parts[0].toLowerCase();
                const lastname = parts[1].toLowerCase();

                // Find a user with either firstname-lastname or lastname-firstname
                const userExists = await User.findOne({
                    $or: [
                        { firstname: new RegExp(`^${firstname}$`, 'i'), lastname: new RegExp(`^${lastname}$`, 'i') },
                        { firstname: new RegExp(`^${lastname}$`, 'i'), lastname: new RegExp(`^${firstname}$`, 'i') }
                    ]
                });

                if (userExists) {
                    mentorStudents.push(name);
                    mentorStudentsMoodle.push(userExists.username);
                }
            }
        }

        // Add mentees to the mentor batch if valid students are found
        if (mentorStudents.length > 0) {
            const existingBatch = await Mentor.findOne({ batch: batchname });

            if (existingBatch) {
                // Append new students to the existing batch
                const uniqueStudents = new Set([...existingBatch.students, ...mentorStudents]);
                existingBatch.students = Array.from(uniqueStudents);
                await existingBatch.save();
                console.log('Mentees updated successfully');
                logMessage(`[=] ${interface} ${userIP} : New mentees existing group under mentor ${userUsername}`);
            } else {
                // Create a new batch with the students
                const newMentees = new Mentor({
                    mentor: userUsername,
                    students: mentorStudents,
                    username: mentorStudentsMoodle,
                    batch: batchname,
                });
                await newMentees.save();
                console.log('Mentees added successfully');
                logMessage(`[=] ${interface} ${userIP} : New mentees added under mentor ${userUsername}`);
            }
        } else {
            console.log('No valid mentees found');
        }
    } catch (error) {
        console.error('Error processing mentees:', error);
    }
}

module.exports = {addMentees}