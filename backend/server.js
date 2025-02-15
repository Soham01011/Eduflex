const express = require("express");
const http = require("http");
const fs = require("fs");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require('body-parser');
const axios = require("axios");
const cookieParser = require("cookie-parser");
const readline = require("readline");
const jwt = require("jsonwebtoken");
const { v4: uuidv4, stringify } = require("uuid");
const multer = require("multer");
require("dotenv").config();
const cors = require("cors");
const {Poppler} = require('node-poppler');

/**
    These are some utilities which are used in the routes to automate some stuff
    You can use them as there functionaly is what there names are.
 */

const {logMessage} = require('./utils/logger');
let {addMentees} = require('./utils/mentees');
let {fetchBadges} = require('./utils/fetchBadges');
let {fetchAndSaveBadges} = require('./utils/fetchAndSaveBadges');
const {checkToken} = require('./middleware/checkToken');
const {checkUserType} = require("./middleware/checkUserType")
let {validatecert} = require('./utils/validatecert');
const {fetchUser} = require('./utils/fetchUser');
let {certificatelevelcheck} = require('./utils/certlevelcheck');
const {interfaceFetch} = require("./utils/interface")

/**
 * Below is the code to have manual feature enabling and disabling commands to make it scalable 
 * they have to set in the env file . BY DEFAULT IT WILL WORK IF NOT SET AS FALSE
 */

if (process.env.USE_PYTHON_SERVER === "false") {
    certificatelevelcheck = false;
    addMentees = false;
    fetchAndSaveBadges = false;
    fetchBadges = false;
    validatecert = false;
}

if(process.env.USE_CREDLY_BADGES === "false"){
    fetchAndSaveBadges, fetchBadges = false;
}

if(process.env.USE_VALIDATE_CERT === "false"){
    validatecert = false;
}

if(process.env.USE_ADD_MENTES === "false"){
    addMentees = false;
}

/*
    These all are the get route requests most of them are just rendering the web 
    pages thus they are inth GET routes folder
*/

const loginRoute = require('./routesGET/loginpage');
const dashboardRoute = require('./routesPOST/dashboardRoute');
const uploadcretRouter = require('./routesGET/uploadcert');
const profilepageRoute = require('./routesGET/profile-web-page');
const explorepageRoute = require('./routesGET/explorepage');
const leaderboardroute = require('./routesGET/leaderboardpage');
const searchuserprofileRoute = require('./routesGET/searchuser');
const maintestpageRoute = require("./routesGET/maintestpage");
const psyychometrictestpageRoute = require("./routesGET/pyschometrictestpage");
const forgetpasswordRoute = require("./routesGET/forogtpassword");
const checkforgotpwdtokenRoute = require("./routesGET/checkpwdtoken");
const profilementorRoute = require("./routesGET/profilepagementor")

/**
   These are the endpoint  with post request mainly requesting the user data 
 */

const loginLogicRouter = require('./routesPOST/login');
const registerLogicRoute = require('./routesPOST/register');
const getuserprofileLogicRoute = require('./routesPOST/getuserprofile');
const psychometrictestLogicRoute = require('./routesPOST/softskilltest');
const feedLogicRoute = require("./routesPOST/feedlogic");
const myprofileLogicRoute = require('./routesPOST/myprofile');
const deletepostLogicRoute = require('./routesPOST/deletepost');
const deletebatchLoginRoute = require('./routesPOST/deletebatch');
const mybatchesLogicRoute = require('./routesPOST/mybatches');
const skillexpeduRoute = require('./routesPOST/skipexpeduRoute');
const likesRoute = require('./routesPOST/likesRoute');
const postsLogicRoute = require("./routesPOST/postsRoute");
const sendforgetmailRoute = require("./routesPOST/sendforgotmail");
const changepasswordRoute = require("./routesPOST/changepassword");
const addbatchRoute = require("./routesPOST/addbatch")


/* 
    These are the schemas / models which are the collections in the database
*/

const CSRFToken = require("./models/csrfttoken");
const User = require("./models/users");
const Profiles = require("./models/profiles");
const Credly = require("./models/credly");
const Mentor = require("./models/mentees");
const Pointshistory = require("./models/pointshistory");

const serverSK = process.env.SERVER_SEC_KEY;

const server = express();

server.use(cookieParser());
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));


// Use CORS middleware
server.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


mongoose.connect("mongodb://127.0.0.1/RMS");

const logDirectory = path.join(__dirname, 'logs');

// Create the logs directory if it doesn't exist
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

/* 
    We have used ejs as our rendring engine and some routes display and load
    documents and scripts from the server.
*/

server.set("view engine", "ejs");
server.set("views", path.join(__dirname, "views"));
server.use(express.static(path.join(__dirname, "public")));
const directoryPath = path.join(__dirname, "uploads");
server.use('/uploads', express.static(directoryPath));
server.use(express.urlencoded({ extended: true }));
server.use(express.json());

/* 
    This is multer disk storage which we are usign to store the user uploads
    ** Dont mess with them until you know checkToken(the utility in the utils folder) working
*/

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

const hashtagDir = '/home/soham-dalvi/Projects/Eduflex/backend/hashtag_extractions';

if (!fs.existsSync(hashtagDir)) {
    fs.mkdirSync(hashtagDir, { recursive: true });
}

const extract_hashtag_folder = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, hashtagDir);
        },
        filename: (req, file, cb) => {
            // Replace spaces and special characters
            const sanitizedFilename = file.originalname.replace(/\s+/g, "_");
            cb(null, sanitizedFilename);
        }
    })
});



const user_profilepic = multer.diskStorage({
    destination: (req, file, callback) => {
        let username;

        // Check if the request is from the Mobile App (req.body.username)
        if (req.body && req.body.username) {
            username = req.body.username; // Use username from the request body (Mobile App)
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
            const profilepic = `uploads/${username}/profile`;
            fs.mkdirSync(profilepic, { recursive: true }); // Create directory recursively
            callback(null, profilepic); // Set upload destination
        } else {
            callback(new Error("Username not found in body or cookie"), null); // Handle missing username
        }
    },
    filename: (req, file, callback) => {
        const fileExtension = file.originalname.split('.').pop();
        const newFilename = `profile.${fileExtension}`; // Filename format: profile.<extension>
        callback(null, newFilename); // Set new filename
    }
});

const profile_pic_upload = multer({ storage: user_profilepic });


// ----------------------------------------------------------------------------------- WEB SITE ROUTES *************** START
server.get("/loginpage", loginRoute);

server.get("/dashboard", dashboardRoute);

server.get("/profile-web-page",profilepageRoute);

server.get("/upload-certificate",uploadcretRouter);

server.get("/explore", explorepageRoute);

server.get('/leaderboard', leaderboardroute);

server.get('/search-profile/:search_query', searchuserprofileRoute);

server.get("/forgotpassword",forgetpasswordRoute);

server.get("/profile-web-page-mentor", profilementorRoute)

// ----------------------------------------------------------------------------------- WEB SITE ROUTES *************** END

server.get("/ping", (req, res) => {
    const userAgent = req.headers['user-agent'];

    console.log("User-Agent:", userAgent);

    // Set default based on the user-agent
    let detectedInterface = "Webapp";

    if (userAgent.includes("Mobile")) {
        detectedInterface = "Mobileapp";
    }
    res.status(200).json({ message: "Server is up and running" });
});

server.post("/mobiletoken", async(req,res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    
    const { mobiletoken } = req.body;
    console.log(mobiletoken);
    try
    {
        const mobile_token_check = await CSRFToken.findOne({ token : mobiletoken});
        const user = await User.findOne({username : mobile_token_check.username});
        const tokenAge = (Date.now() - mobile_token_check.createdAt) / (1000*60*60*24);
        if(tokenAge > 30)
        {
            console.log("token expired");
            logMessage(`[=] Mobileapp ${userIP} : Token for user ${mobile_token_check.username} has expired`);
            await CSRFToken.deleteOne({ token : mobile_token_check.token});
            return res.status(400).json({message : "expired"}); 
        }
        else if(!mobile_token_check)
        {
            console.log("token not ofund");
            return res.status(401).json({message : "No token found"});
        }
        else{
            if(fetchAndSaveBadges){
                fetchAndSaveBadges(mobile_token_check.username);
                logMessage(`[=] Mobileapp ${userIP} : Token for user ${mobile_token_check.username} is valid`);
                console.log("token found");
                return res.status(200).json({ message : "valid" ,user_type : user.user_type });
            }
            else{
                console.log('[INFO] * Credly system is disabled , enable it in env file')
            }
        }
    }
    catch (e)
    {
        logMessage(`[*] Mobile token checking error ${e}`);
        return res.status(200).json({ message : "Internal Server Error"});
    }
});


server.post('/login',loginLogicRouter);

server.post("/logout", checkToken, async (req, res) => {
    // Extract Token from the request body
    const { Token } = req.body;

    // Check if the Token exists in the request body
    if (Token) {
        console.log("Token logged out:", Token);
        // Delete the CSRF token associated with this token
        await CSRFToken.deleteOne({ token: Token });
        return res.status(200).json({ message: "Logged out" });
    } 
    // If no Token in the body, check cookies
    else if (req.cookies.token) {
        const username = await fetchUser(req, res);
        await CSRFToken.deleteOne({ username: username, interface: "Webapp" });
        return res.status(200).json({ message: "Logged out" });
    } else {
        return res.status(400).json({ message: "Token or cookie required for logout." });
    }
});

server.post('/register', registerLogicRoute);


server.post('/changeprofile',checkToken,profile_pic_upload.single('file'),async (req, res) => {
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }

        // Destructure the request body to get all fields
        let {
            Token,
            firstName,
            lastName,
            changeemail,
            changepwd,
            changephoneno,
            dob,
            github,
            website,
            bio,
            college,
            academicyear,
            semester,
            cgpa,
            hobby,
            credly,
            interface,
            department
        } = req.body;


        if (!Token) {
            const raw_token = req.cookies.Token;

            if (!raw_token) {
                return res.status(400).json({ message: 'Token is required.' });
            }

            try {
                // Verify and decode the token using serverSK
                const decodedToken = jwt.verify(raw_token, serverSK);
                Token = decodedToken.userId; // Extract userId from the decoded token
            } catch (error) {
                console.log('Error decoding token:', error.message);
                return res.status(400).json({ message: 'Invalid or expired token.' });
            }
        }

        // Check if the token is provided
        const tokencheck = await CSRFToken.findOne({ token: Token });

        // Validate token
        if (!tokencheck || tokencheck.token !== Token) {
            logMessage(
                `[-] ${interface} ${userIP} : Invalid token provided for changing user data. Token: ${Token}`
            );
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (changeemail && !emailRegex.test(changeemail)) {
            logMessage(
                `[-] ${interface} ${userIP} : Failed to update profile. Invalid email format. Token: ${Token}`
            );
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (changepwd && !passwordRegex.test(changepwd)) {
            logMessage(
                `[-] ${interface} ${userIP} : Failed to update profile. Weak password. Token: ${Token}`
            );
            return res.status(400).json({
                message:
                    'Password must be at least 8 characters long, and contain at least one symbol, one uppercase letter, one lowercase letter, and one number.'
            });
        }

        // Phone number length validation
        const phoneRegex = /^\d{10,11}$/;
        if (changephoneno && !phoneRegex.test(changephoneno)) {
            logMessage(
                `[-] ${interface} ${userIP} : Failed to update profile. Invalid phone number. Token: ${Token}`
            );
            return res.status(400).json({ message: 'Invalid phone number.' });
        }

        // Update user data if all validations pass
        try {
            await User.updateOne(
                { username: tokencheck.username },
                {
                    $set: {
                        firstname: firstName,
                        lastname: lastName,
                        password: changepwd,
                        email: changeemail,
                        phone_number: changephoneno,
                        dob: dob,
                        github: github,
                        website: website,
                        bio: bio,
                        college: college,
                        academic_year: academicyear,
                        semester: semester,
                        cgpa: cgpa,
                        hobby: hobby,
                        department: department
                    }
                },
                { upsert: true }
            );

            // Handle Credly badge fetching
            if (credly && fetchBadges) {
                fetchBadges(interface,credly,firstName,lastName,tokencheck.username,userIP) 
            }
            else if (credly){
                console.log('[INFO] * Credly system is disabled, enable it in env file')
            }

            // Delete the used token
            await CSRFToken.deleteOne({ token: Token });
            logMessage(`[=] ${interface} ${userIP} : ${tokencheck.username} updated their profile.`);
            return res.status(200).json({ message: 'Update successful.' });
        } catch (e) {
            logMessage(`[*] Internal server error: ${e}`);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
);

server.post("/addbatch", extract_hashtag_folder.single('file'), async (req, res) => {
    const { post_desc, timeslot, selection } = req.body;
    
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    const interface = "Webapp"
    const userUsername = await fetchUser(req, res);

    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).json({ message: "No file received!" });
    }

    const file = req.file.filename; // Extract the filename
    const filePath = req.file.path;
    console.log(post_desc, timeslot, selection,file , filePath);
    if (!fs.existsSync(filePath)) {
        console.error("File was not saved:", filePath);
        return res.status(500).json({ message: "File upload failed!" });
    }

    if (addMentees) {
        addMentees(userUsername, file, post_desc, selection, interface, userIP, timeslot);
    }

    res.status(200).json({ message: "Batch added successfully", file });
});


/* *
----------------P.S. => The uploads route is retoured to postsmanage to avoid complexity 

server.post("/upload", checkToken, upload.single('file'), async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        const userIP = response.data.ip;
        let { Token, up_username, post_type, post_desc, interface,selection ,post_name, post_org,post_cred_id,post_cred_url,start_time,end_time,cert_type } = req.body;
        let { hashtags } = req.body;
        console.log(hashtags, post_type, post_desc, interface);

        if (post_type === "mentor_file_upload") {
            console.log("MEntor uploading")
            if(addMentees){
            addMentees(up_username, req.file.filename, post_desc, selection, userIP, interface);
            }
            else{
                console.log('[INFO] * Mentess part is disabled, enable it in env file.')
            }
        }

        // Handle `hashtags` whether it is a string or an array
        if (typeof hashtags === 'string') {
            hashtags = hashtags.split(',').filter(tag => tag.trim() !== '');
        }

        // Ensure hashtags is an array
        if (!Array.isArray(hashtags)) {
            return res.status(400).json({ message: "Invalid hashtags format" });
        }

        if (!Token && !up_username && post_type === 'post' && interface === 'Webapp') {
            const tokenFromCookie = req.cookies.Token;
            if (!tokenFromCookie) {
                return res.status(400).json({ message: "Token is missing from cookies" });
            }

            try {
                const decodedToken = jwt.verify(tokenFromCookie, serverSK);
                Token = decodedToken.userId;
                up_username = decodedToken.username;
            } catch (error) {
                return res.status(400).json({ message: "Invalid token" });
            }
        }

        let user_data = null; // Initialize user_data

        if (!Token && interface === "Mobileapp") {
            const tokencheck = await CSRFToken.findOne({ token: Token });
            if (!tokencheck || up_username !== tokencheck.username) {
                return res.status(400).json({ message: "Invalid Token or Username" });
            }
            user_data = await User.findOne({ username: up_username });
            if (!user_data) {
                return res.status(404).json({ message: "User not found" });
            }
        }

        // Check if `req.file` exists and extract the filename safely
        let filename = req.file ? req.file.originalname : undefined;

        // Sanitize the filename if it exists
        if (!filename) {
            return res.status(400).json({ message: "Filename is missing" });
        }

        const sanitizedFilename = filename.replace(/\s+/g, '_');
        const filePath = `uploads/${up_username}/${up_username}-${sanitizedFilename}`;
        console.log("-----------", Token, interface, up_username, sanitizedFilename, filePath);
        
        if (post_type === "post") {
            console.log("POST OF STUDENT");
        
            const cleanedHashtags = hashtags.map(tag => tag
                .replace(/[^a-zA-Z0-9\s]/g, ' ')  // Replace all non-alphanumeric characters with space
                .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
                .trim()  // Remove leading and trailing spaces
            );
        
            const brokenTags = cleanedHashtags.flatMap(tag => tag.split(' ')).filter(word => word.length > 0);
            const user_data = await User.findOne({ "username": up_username });
            let [model_result, producer] = '';
            let [post_type, post_subtype] = ['post', null]; // Set post_subtype to null instead of ''
        
            if (validatecert) {
                [model_result, producer] = await validatecert(up_username, sanitizedFilename);
            } else {
                console.log('[INFO] * Validate cert is disabled, enable it in the env file');
            }
        
            if (certificatelevelcheck) {
                const certResult = await certificatelevelcheck(filePath);
                if (certResult) {
                    const { type, subtype } = certResult;
                    post_type = type || post_type; // Default to 'post' if type is missing
                    post_subtype = subtype || null; // Default to null if subtype is missing
                }
            } else {
                console.log('[INFO] * Flask server is disabled, enable it in the env file');
            }

            console.log(post_type , post_subtype);

            let points = 0;

            // Determine points based on post_type and post_subtype
            if (post_type === 'academic') {
                if (post_subtype === 'local') {
                    points = 5;
                } else if (post_subtype === 'global') {
                    points = 10;
                } else if (post_subtype === 'intermediate') {
                    points = 7;
                }
            }
            
            // Save points history
            const newPointsHistory = new Pointshistory({
                username: up_username, // Add the username
                post_type: post_type, // Post type
                post_subtype: post_subtype, // Post subtype
                points: points, // Points calculated based on post_subtype
                time: new Date() // Save the current time
            });
            
            await newPointsHistory.save();
        
            const newpost = new Profiles({
                firstname: user_data ? user_data.firstname : null, // Check if user_data exists
                lastname: user_data ? user_data.lastname : null,
                username: up_username,
                postID: `${up_username}-${uuidv4()}`, // Unique post ID
                file: filePath,
                post_subtype: post_subtype, // Use null if no subtype is set
                post_type: post_type,       // Use 'post' if no type is set
                post_name: post_name,       // Include post_name
                post_org: post_org,         // Include post_org
                post_cred_id: post_cred_id, // Include post_cred_id
                post_cred_url: post_cred_url, // Include post_cred_url
                start_time: start_time,     // Include start_time
                end_time: end_time,         // Include end_time
                post_likes: 0,
                hashtags: cleanedHashtags,
                broken_tags: brokenTags,
                approved: false,            // Initially set to false as the mentor has not reviewed yet
                mentor_approved: null,      // Set to null as default, waiting for mentor approval
                interface: interface,
                model_approved: true,       // Assuming model approval is granted based on your logic
                real: model_result === 'Real', // Set real based on validation
                edited_by: producer        // Keep track of who edited the post
            });
        
            // Save the new post to the database
            await newpost.save();
        
            logMessage(`[=] ${interface} ${userIP} : Posted a file ${up_username}-${filename}`);
            return res.status(200).json({ message: "Uploaded Successfully" });
        }
        
    } catch (error) {
        console.error(`[*] Internal server error: ${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
});
*/


server.post("/getUserProfile", getuserprofileLogicRoute);

server.get("/myprofile",checkToken, async(req,res)=> {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();z
    }
    const token_cookie = req.cookies.Token;
    const decode = jwt.verify(token_cookie , serverSK);
    const token_username =''
    if(decode && decode.token){
    
        token_username = await CSRFToken.findOne({ username : decode.username});
        if(!token_username){
            res.redirect('/loginpage');
        }
    }

    try{
        const user_profile_data = await Profiles.find({username : token_username});
        const user_Data = await User.findOne({username : token_username});
        res.render("profile",{certificateData : user_profile_data, userBio: user_Data, profilePic: "/uploads/${tokencheck.username}/profile.jpg" });
    }
    catch (error){
        logMessage(`[*] Internal server error : ${error}`);
        res.status(500);
    }
});

server.post("/myprofile",checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const { Token, interface } = req.body;
    const interfaceType = interface || "Webapp";
    const tokencheck = await CSRFToken.findOne({ token: Token });

    if (tokencheck) {
        try {
            const user_profile_data = await Profiles.find({ username: tokencheck.username });
            const user_credly_data = await Credly.find({ username: tokencheck.username });
            const user_bio_data = await User.find({username: tokencheck.username});

            // Include the file paths for images
            const profilePosts = user_profile_data.map(post => {
                if (post.file) {
                    const images = fs.readdirSync(path.dirname(post.file))
                        .filter(file => file.startsWith(path.basename(post.file, path.extname(post.file))) && file.endsWith('.jpg'))
                        .map(file => `/uploads/${post.username}/${file}`);
                    return {
                        ...post._doc,
                        images,
                        post_desc: post.post_desc
                    };
                }
                return post;
            });

            console.log(user_profile_data); 
            console.log(profilePosts); 

            logMessage(`[=] ${interfaceType} ${userIP} : ${tokencheck.username} pulled their own profile`);
            if(interfaceType === "Mobileapp"){
                res.status(200).json({ userbio : user_bio_data,data: profilePosts, credly: user_credly_data });
            }
            else
            {
                res.render("profile",{certificateData : profilePosts, userBio:user_bio_data, profilePic: "/uploads/${tokencheck.username}/profile.jpg" });
            }
        } catch (error) {
            logMessage(`[*] ${interfaceType} ${userIP} : Internal server error ${error}`);
            res.status(500).json({ message: "Internal server error" });
        }
    } else {
        res.status(400).json({ message: "Invalid Token" });
    }
});
// server.post('/myprofile', myprofileLogicRoute); THIS ROUTE IS BROKEN

server.post('/deletePost', deletepostLogicRoute);

server.use("/likeapi",likesRoute);



server.post("/mybatches",mybatchesLogicRoute);


server.post('/delete-batch',deletebatchLoginRoute)


/*
==== > FUTURE PLAN TO AUTO MATE THE CERT METADATA

server.post("/extract-hashtags", checkToken, extract_hashtag_folder.single('file'), async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const { Token, interface, filename, up_username } = req.body;

    const filePath = path.join(__dirname, 'hashtag_extractions', req.file.filename);

    console.log("---------------------", filePath);
    try {
        // Step 1: Extract lines from Flask server
        const flaskResponse = await axios.post('http://localhost:5000/autohash', {
            filePath: filePath,
            mode: "pdf"
        });

        const lines = flaskResponse.data.lines;

        if (!lines || lines.length === 0) {
            return res.status(400).json({ message: 'No lines extracted from the file.' });
        }

        // Prepare the prompt for Ollama
        const llamaPrompt = `
        From the following lines, extract:
        - The certificate name or position at work.
        - The name of the issuer, which could be an institute, company, or organizer (e.g., sports organizer or event organizer).
        
        Return the results strictly as JSON with the fields:
        - "certificatename": for the certificate name or position.
        - "issuer": for the issuer name, company name, or organizer and not the name of any college.
        
        If no relevant data can be extracted, return:
        {
          "certificatename": "",
          "issuer": ""
        }
        
        Lines:
        ${lines.join('\n')}
        `;
        
        // Step 2: Send to Ollama model
        const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
            model: 'llama3.2:3b',
            prompt: llamaPrompt,
        });

        let fullResponse = '';
        const dataArray = ollamaResponse.data.split("\n");

        // Step 3: Rebuild the full response by concatenating "response" fields
        dataArray.forEach(item => {
            const responseMatch = item.match(/"response":"(.*?)"/); // Match the response value
            if (responseMatch && responseMatch[1]) {
                fullResponse += responseMatch[1]; // Append the response value to the full response
            }
        });

        console.log('Full concatenated response before sanitization:', fullResponse);

        // Step 4: Fix invalid JSON format
        fullResponse = fullResponse
            .replace(/\\n/g, "") // Remove newline escape sequences
            .replace(/\\+"/g, '"') // Replace \" with "
            .replace(/\\'/g, "'") // Replace \' with '
            .replace(/\\(.)/g, '$1'); // Remove any remaining backslashes

        console.log('Sanitized full response:', fullResponse);

        // Step 5: Parse JSON objects from the sanitized response
        let result = {};
        try {
            const jsonRegex = /{[^{}]*}/g; // Matches everything inside curly braces
            const matches = fullResponse.match(jsonRegex); // Extract JSON-like objects

            if (matches) {
                matches.forEach(match => {
                    try {
                        const jsonResponse = JSON.parse(match); // Parse valid JSON object
                        const { certificatename, issuer } = jsonResponse;

                        if (certificatename || issuer) {
                            result = { certificatename, issuer }; // Update result if data exists
                        }
                    } catch (error) {
                        console.error('Error parsing individual JSON object:', match, error);
                    }
                });
            }
        } catch (error) {
            console.error('Error parsing JSON:', fullResponse, error);
        }

        // Step 6: Return the extracted information
        const { certificatename, issuer } = result;
        return res.status(200).json({
            message: 'Extraction successful.',
            certificatename: certificatename || "",
            issuer: issuer || ""
        });

    } catch (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).json({ message: 'An error occurred during the process.', error: error.message });
    }
});*/


server.post("/postpermission", checkToken, async (req, res) => {
    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    console.log("POST PERMISSION");

    const { Token, up_username ,interface} = req.body;

    const check_token = await CSRFToken.findOne({ token: Token });
    console.log("Token:", Token, "username:", check_token?.username);

    if (check_token.username) {
        const mybatches_data = await Mentor.find({ mentor: check_token.username });
        console.log("Token true\n", mybatches_data);

        let results = {};

        for (const batchData of mybatches_data) {
            const batchName = batchData.batch;
            const studentsNames = batchData.students;
            const studentsUsernames = batchData.username;

            results[batchName] = {};

            for (let i = 0; i < studentsNames.length; i++) {
                const studentName = studentsNames[i];
                const studentUsername = studentsUsernames[i];

                // Fetch unapproved posts for the student
                const unapprovedPosts = await Profiles.find({
                    username: studentUsername,
                    approved: false
                });

                // Map unapproved posts to include all required fields
                results[batchName][studentName] = unapprovedPosts.map(post => ({
                    postId: post.postID,
                    imagePaths: post.imagePaths, // Ensure this field is included
                    post_desc: post.post_desc,
                    post_type: post.post_type,
                    post_likes: post.post_likes,
                    file: post.file,
                    interface: post.interface,
                    approved: post.approved,
                    model_approved: post.model_approved,
                    real : post.real,
                    ...(post.real === false && { edited_by: post.edited_by })
                }));
            }
        }
        logMessage(`[=] ${interface} ${userIP} : ${check_token.username} fetched post permissions`);

        res.status(200).json(results);

    } else {
        logMessage(`[-] ${interface} ${userIP} : ${check_token.username} couldn't fetched post permissions`);
        res.status(404).send("Token not valid");
    }
});

server.post("/status-post", checkToken,async(req,res)=> {
    const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const {Token , postId , up_username , status , interface } = req.body;
    if (Token)
    {    
        const check_token = await CSRFToken.findOne({ token : Token});
        if (check_token.username == up_username)
        {
            if (status == "approved") {
                try {
                    const result = await Profiles.findOneAndUpdate(
                        { postID: postId },
                        { 
                            $set: { 
                                approved: true, 
                                mentor_approved: "approved" 
                            } 
                        },
                        { new: true }
                    );
                
                    if (!result) {
                        return res.status(404).json({ message: 'Post not found' });
                    }
                    logMessage(`[=] ${interface} ${userIP} : ${up_username} approved post ${postId}`);
                    return res.status(200).json({ message: 'Post approved successfully' });
                } catch (error) {
                    logMessage(`[*] Internal Server error : failed to approve post : ${error}`);
                    return res.status(500).json({ message: 'Internal Server error' });
                }
            } else if (status == 'rejected') {
                try {
                    console.log("REJECTED : ", postId);
                    const result = await Profiles.findOneAndUpdate(
                        { postID: postId },
                        { 
                            $set: { 
                                approved: true, 
                                mentor_approved: "rejected" 
                            } 
                        },
                        { new: true }
                    );
                
                    if (!result) {
                        return res.status(404).json({ message: 'Post not found' });
                    }
                
                    logMessage(`[=] ${interface} ${userIP} : ${up_username} rejected post ${postId}`);
                    return res.status(200).json({ message: 'Post rejected successfully' });
                } catch (error) {
                    logMessage(`[*] Internal Server error : rejected post ${postId}, error ${error}`);
                    return res.status(500).json({ message: 'Internal Server error' });
                }
            }

            
        }
        else{
            logMessage(`[-] ${interface} ${userIP} : Invalid request : ${up_username} ${postId}`);
            return res.status(404).json({ message: 'invalid request' });
        }
}
});

server.get("/search-user-result",async(req,res)=> {
    try {
        const searchQuery = req.query.q; 
        console.log(searchQuery);
        if (!searchQuery) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const users = await User.find({
            $or: [
                { firstname: { $regex: searchQuery, $options: 'i' } },
                { lastname: { $regex: searchQuery, $options: 'i' } },
                { username: { $regex: searchQuery, $options: 'i' } },
            ]
        });

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        return res.json(users);
    } catch (err) {
        console.error('Error searching for users:', err);
        res.status(500).json({ error: 'An error occurred while searching for users' });
    }
});

server.get("/profile", async (req, res) => {
    const { username } = req.query; // Correct extraction of username
    console.log(username);
    try {
        const profiles = await Profiles.find({ username: username }); 
        console.log(profiles)

        if (profiles.length === 0) {
            return res.status(404).json({ message: "No profiles found" });
        }

        // Map the results to only include relevant fields
        const responseData = profiles.map(profile => ({
            imagePaths: profile.imagePaths,
            post_desc: profile.post_desc,
            hashtags: profile.hashtags,
            post_likes: profile.post_likes
        }));

        //console.log(responseData);
        res.status(200).json(responseData); // Return the array of profiles
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

server.post("/psychometrictest",psychometrictestLogicRoute);

server.get("/psychometrictestpage", psyychometrictestpageRoute);

server.get("/alltest", maintestpageRoute);

server.get('/feed',feedLogicRoute);

server.use('/experience',skillexpeduRoute);

server.use('/postsmanage', postsLogicRoute);

server.post('/checkforgetmail', sendforgetmailRoute);

server.get('/forgotpwdverify', checkforgotpwdtokenRoute);

server.post("/changepassword" , changepasswordRoute);

// TESTING ROUTES -------------------------------------------------------------------------------------------------------------

server.get('/testingroute',checkToken , async(req,res) => {
    res.render('test');
});

// TESTING ROUTES -------------------------------------------------------------------------------------------------------------

server.listen(8000, () => {
    console.log(`http://localhost:8000`);
  });


// this third comment