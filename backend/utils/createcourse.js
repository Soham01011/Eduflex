const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const User = require('../models/users');
const Course = require('../models/coursescert');
const { logMessage } = require('./logger');

async function addstudtoCourse(userUsername, filename, coursename, class_name ,department, selection, interface, userIP){
    const form = new FormData();
    const filePath = `/home/soham-dalvi/Projects/Eduflex/backend/hashtag_extractions/${filename}`;
    form.append('file', fs.createReadStream(filePath));
    form.append('selection', selection.toLowerCase());

    console.log("Initiating mentee addition process...");

    try{
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

        if (mentorStudents.length > 0) {
            const newCourse = new Course({
                mentor: userUsername,
                students: mentorStudents,
                username: mentorStudentsMoodle,
                course_name: coursename,
                class_name: class_name,
                department: department,
            });
            await newCourse.save();
            console.log('Mentees added successfully.');
            logMessage(`[=] ${interface} ${userIP} : Mentees added for mentor ${userUsername} in new batch ${batch_name}`);
        }
    }

    catch(err){
        logMessage(`[*] ERROR : ${err}`)
        return err
    }
}

module.exports = {addstudtoCourse};