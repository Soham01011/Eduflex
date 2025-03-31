const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const { checkToken } = require("../middleware/checkToken");
const { logMessage } = require("../utils/logger");
const { fetchUser } = require("../utils/fetchUser");
let { validatecert } = require("../utils/validatecert");

const User = require("../models/users");
const Pointshistory = require("../models/pointshistory");
const Profiles = require("../models/profiles");

if (process.env.USE_PYTHON_SERVER === "false") {
    validatecert = false;
}

if(process.env.USE_VALIDATE_CERT === "false"){
    validatecert = false;
}

const serverSK = process.env.SERVER_SEC_KEY;

const postsRouter = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        let username;

        // Check if the request is from the Mobile App (req.body.up_username)
        if (req.body && req.body.up_username) {
            username = req.body.up_username; // Use username from the request body (Mobile App)
        }

        // Otherwise, check if the request is from the Webapp (req.cookies.Token)
        else if (req.cookies && req.cookies.Token) {
            try {
                // Decode the token from the cookie
                const decodedToken = jwt.verify(req.cookies.Token, serverSK);
                username = decodedToken.username; // Extract username from decoded token (Webapp)
            } catch (error) {
                console.error("Error decoding token from cookie:", error.message);
                return callback(new Error("Invalid token in cookie"), null);
            }
        }

        // Ensure username is available for file storage
        if (username) {
            const uploadDir = `uploads/${username}`; // Use the username in the directory structure
            fs.mkdirSync(uploadDir, { recursive: true }); // Create directory recursively
            callback(null, uploadDir); // Set the upload directory
        } else {
            callback(new Error("Username not found in body or cookie"), null); // Handle missing username
        }
    },
    filename: (req, file, callback) => {
        let username = req.body.up_username; // Default to body username
        
        // Check if the request is from Webapp and username is in cookies
        if (!username && req.cookies && req.cookies.Token) {
            try {
                // Decode the token from the cookie
                const decodedToken = jwt.verify(req.cookies.Token, serverSK);
                username = decodedToken.username; // Extract username from decoded token (Webapp)
            } catch (error) {
                console.error("Error decoding token from cookie:", error.message);
                return callback(new Error("Invalid token in cookie"), null);
            }
        }

        if (username) {
            // Replace spaces with underscores in the file name
            const originalName = file.originalname.replace(/\s+/g, '_');
            const newFilename = username + "-" + originalName; // Format: <username>-<original_filename>
            console.log("Filename:", newFilename);
            callback(null, newFilename); // Set the new file name
        } else {
            callback(new Error("Username not found"), null); // Handle missing username
        }
    }
});

const upload = multer({ storage: storage });

postsRouter.post('/post/webapp',checkToken,upload.single('file'), async(req,res)=> {

    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log('pingged the server to delete')
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const {selection ,post_name, post_org,post_cred_id,post_cred_url,start_time,end_time,cert_type ,hashtags} = req.body;

    console.log("CERTYPE" , cert_type)
    if(!post_name && !post_org && !selection && !start_time && !cert_type && !hashtags){
        return res.status(400).json({message: "post name , organization name , start date , certificate type , tags are missing"})
    }
    
    let filename = req.file ? req.file.originalname : undefined;

    if (!filename) {
        return res.status(400).json({ message: "File is missing" });
    }
    const up_username = await fetchUser(req,res);
    const sanitizedFilename = filename.replace(/\s+/g, '_');
    const filePath = `uploads/${up_username}/${up_username}-${sanitizedFilename}`;
    try{
        const userfirstlastname = await User.findOne({"username" : up_username}).select("firstname lastname");
        let [model_result, producer] = '';

        if (validatecert) {
            [model_result, producer] = await validatecert(up_username, sanitizedFilename);
        } else {
            console.log('[INFO] * Validate cert is disabled, enable it in the env file');
        }

        let points = 0;

        if (cert_type === 'academic') {
            if (selection === 'Entry/Foundation') {
                points = 5;
            } else if (selection === 'Intermediate') {
                points = 7;
            } else if (selection === 'Global/Industry Specific') {
                points = 10;
            }
        }
        if (cert_type === 'experience') {
            if (selection === 'Internship') {
                points = 6;
            } else if (selection === 'Job') {
                points = 8;
            } else if (selection === 'Entrepreneurship') {
                points = 10;
            }
        }
        if (cert_type === 'extracurricular') {
            if (selection === 'Sports') {
                points = 6;
            } else if (selection === 'Creative Arts') {
                points = 6;
            } else if (selection === 'Hackathon') {
                points = 5;
            } else if (selection === 'Seminar') {
                points = 10;
            } else if (selection === 'Host') {
                points = 8;
            }
        }

        const postid = `${up_username}-${uuidv4()}`

        const newPointsHistory = new Pointshistory({
            username: up_username, // Add the username
            postID : postid,
            post_type: cert_type, // Post type
            post_subtype: selection, // Post subtype
            points: points, // Points calculated based on post_subtype
            time: new Date() // Save the current time
        });

        await newPointsHistory.save();

        const newpost = new Profiles({
            firstname: userfirstlastname ? userfirstlastname.firstname : null, // Check if user_data exists
            lastname: userfirstlastname ? userfirstlastname.lastname : null,
            username: up_username,
            postID: postid, // Unique post ID
            file: filePath,
            post_subtype: selection, // Use null if no subtype is set
            post_type: cert_type,       // Use 'post' if no type is set
            post_name: post_name,       // Include post_name
            post_org: post_org,         // Include post_org
            post_cred_id: post_cred_id, // Include post_cred_id
            post_cred_url: post_cred_url, // Include post_cred_url
            start_time: start_time,     // Include start_time
            end_time: end_time,         // Include end_time
            post_likes: 0,
            hashtags: hashtags,
            approved: false,            // Initially set to false as the mentor has not reviewed yet
            mentor_approved: null,      // Set to null as default, waiting for mentor approval
            interface: "Webapp",
            model_approved: true,       // Assuming model approval is granted based on your logic
            real: model_result === 'Real', // Set real based on validation
            edited_by: producer        // Keep track of who edited the post
        });

        // Save the new post to the database
        await newpost.save();

        logMessage(`[=] Webapp ${userIP} : Posted a file ${up_username}-${filename}`);
        return res.status(200).json({ message: "Uploaded Successfully" });
    }
    catch(error){
        logMessage(`[*] Internal server error : ${error}`);
        console.error(error);
        return res.status(500).json({error : "Internal server error"});
    }
});


module.exports = postsRouter;