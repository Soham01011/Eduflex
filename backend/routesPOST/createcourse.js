const express = require("express")
const createCourseRoute = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Course = require("../models/coursescert");
const {checkTokenAndUserType} = require("../middleware/checkTokenandUsertype");
const {logMessage} = require("../utils/logger");
const {fetchUser} = require("../utils/fetchUser");
const hashtagDir = path.join(__dirname, "../hashtag_extractions"); // Ensure correct path
const {addstudtoCourse} = require("../utils/createcourse")

// Create directory if it doesn't exist
if (!fs.existsSync(hashtagDir)) {
    fs.mkdirSync(hashtagDir, { recursive: true });
}
const extract_hashtag_folder = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, hashtagDir);  // Use the absolute path
        },
        filename: (req, file, cb) => {
            const sanitizedFilename = file.originalname;
            cb(null, sanitizedFilename);
        }
    })
});

createCourseRoute.post("/createcourse-mentor", checkTokenAndUserType, extract_hashtag_folder.single("file"), async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const {course_name , department ,batch_name , selection} =req.body

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const sanitizedFilename = req.file.originalname; 

    console.log(await fetchUser(req,res),sanitizedFilename,course_name,batch_name, department , selection,"Webapp",userIP)

    addstudtoCourse(await fetchUser(req,res),sanitizedFilename,course_name,class_name = batch_name, department , selection,"Webapp",userIP);

    res.redirect("/profile-web-page-mentor");
});
    
module.exports = createCourseRoute