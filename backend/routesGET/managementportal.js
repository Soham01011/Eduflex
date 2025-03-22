const express = require("express");
const managementProtal = express.Router();

const { fetchUser } = require("../utils/fetchUser");
const { checkTokenAndUserType } = require("../middleware/checkTokenandUsertype");

const Mentees = require("../models/mentees");
const Profiles = require("../models/profiles");
const Courses = require("../models/coursescert");

managementProtal.get("/management-portal-mentor", checkTokenAndUserType, async (req, res) => {
    const username = await fetchUser(req, res);
    const mentees = await Mentees.find({ "mentor": username });
    const menteesUsername = mentees.flatMap(mentee => mentee.username);
    const students_uploads = await Profiles.find({ username: { $in: menteesUsername } });
    const teachercourses = await Courses.find({ mentor: username });

    let Studentdonecourse = [];

    for (let course of teachercourses) {
        let enrolled_count = course.username.length;
        let submmisions_count = 0;
        let pending_count = 0;

        let studentProfiles = await Promise.all(course.username.map(async (student_ID) => {
            const profile = await Profiles.findOne({ username: student_ID, post_name: course.course_name });

            if (profile) {
                submmisions_count++;
                if (profile.mentor_approved === null) {
                    pending_count++;
                }
            }

            return {
                student_ID,
                hasProfile: !!profile,
                profileDetails: profile || null
            };
        }));

        Studentdonecourse.push({
            course_name: course.course_name,
            class_name: course.class_name,
            department: course.department,
            enrolled_count,
            submmisions_count,
            pending_count,
            students: studentProfiles
        });
    }

    res.render("managementprotal", { username, Studentdonecourse, mentees, students_uploads, teachercourses });
});

module.exports = managementProtal;
