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
const { format } = require('date-fns');
const FormData = require('form-data');
const multer = require("multer");
require("dotenv").config();
const cors = require("cors");
const pdf = require('pdf-poppler');
const { exec } = require('child_process');
const socketIo = require('socket.io');
const CSRFToken = require("./models/csrfttoken");
const User = require("./models/users");
const Profiles = require("./models/profiles");
const Credly = require("./models/credly");
const Mentor = require("./models/mentees");

const BASE_URL = 'https://nice-genuinely-pug.ngrok-free.app/';
const serverSK = process.env.SERVER_SEC_KEY;

const server = express();

server.use(cookieParser());
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));


// Use CORS middleware
server.use(cors({
    origin: '*', // an coming request
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));


mongoose.connect("mongodb://127.0.0.1/RMS");

const logDirectory = path.join(__dirname, 'logs');

// Create the logs directory if it doesn't exist
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

const getLogFileName = () => {
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    return path.join(logDirectory, `${dateStr}.log`);
};

const logMessage = (message) => {
    const logFile = getLogFileName();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    fs.open(logFile, 'a', (err, fd) => {
        if (err) {
            throw err;
        }

        fs.appendFile(fd, logEntry, (err) => {
            if (err) throw err;
            fs.close(fd, (err) => {
                if (err) throw err;
            });
        });
    });
};

async function addMentees(userUsername, filename, batchname, selection,interface,userIP) {
    const form = new FormData();
    const filePath = `C:/Eduflex/backend/uploads/${userUsername}/${filename}`;
    form.append('file', fs.createReadStream(filePath));
    form.append('selection', selection);
    console.log(" here in async function");
    try {
        const form = new FormData();
        const filePath = `C:/Eduflex/backend/uploads/${userUsername}/${filename}`;
        form.append('file', fs.createReadStream(filePath));
        form.append('selection', selection.toLowerCase());

        console.log("Uploading file...");

        const response = await axios.post('http://localhost:5000/upload', form, {
            headers: {
                ...form.getHeaders(),
            },
        });

        const data = response.data.data;
        console.log('Extracted Data:', data);

        const mentorStudents = [];
        const mentorStudentsMoodle = [];

        for (const name of data) {
            const parts = name.split(' ');
            if (parts.length >= 2) {
                const firstname = parts[0].toLowerCase();
                const lastname = parts[1].toLowerCase();
                

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

        if (mentorStudents.length > 0) {
            const existingBatch = await Mentor.findOne({ batch: batchname });

            if (existingBatch) {
                // Append new students to the existing batch
                const uniqueStudents = new Set([...existingBatch.students, ...mentorStudents]);
                existingBatch.students = Array.from(uniqueStudents);
                await existingBatch.save();
                console.log('Mentees updated successfully');
                logMessage(`[=] ${interface} ${userIP} : New mentees existing group under mentor ${userUsername} `) 
            } else {
                // Create a new batch
                const newMentees = new Mentor({
                    mentor: userUsername,
                    students: mentorStudents,
                    username : mentorStudentsMoodle,
                    batch: batchname,
                });
                await newMentees.save();
                console.log('Mentees added successfully');
                logMessage(`[=] ${interface} ${userIP} : New mentees added under mentor ${userUsername} `) 

            }
        }
         else {
            console.log('No valid mentees found');
        }
    } catch (error) {
        console.error('Error processing mentees:', error);
    }
}

async function fetchAndSaveBadges(userUsername) {
    try {
        // Retrieve user data from Credly and User collections
        const mycredly_data = await Credly.findOne({ username: userUsername });
        const db_user = await User.findOne({ username: userUsername });
        const firstname = db_user.firstname;
        const lastname = db_user.lastname;

        if (!mycredly_data) {
            throw new Error('User not found');
        }
        if(mycredly_data.link){
            const credlylink = mycredly_data.link;
            const response = await axios.get('http://localhost:5000/fetch-badges', {
                params: { url: credlylink }
            });

            const badgeDataArray = response.data;

            // Fetch existing badges for this user from the database
            const existingBadges = await Credly.find({ username: userUsername });

            // Create a set of existing badge identifiers (e.g., certificate name and issue date)
            const existingBadgeIdentifiers = new Set(
                existingBadges.map(badge => `${badge.cert_name}-${badge.issue_date}`)
            );

            // Prepare an array to hold new badges
            const newBadges = [];

            // Identify new badges
            for (const badge of badgeDataArray) {
                const badgeIdentifier = `${badge.certificate_name}-${badge.issued_date}`;
                if (!existingBadgeIdentifiers.has(badgeIdentifier)) {
                    newBadges.push({
                        firstname: firstname,
                        lastname: lastname,
                        username: userUsername,
                        link: credlylink,
                        issuer_name: badge.issuer_name,
                        cert_name: badge.certificate_name,
                        issue_date: badge.issued_date
                    });
                }
            }

            // Insert only new badges into the database
            if (newBadges.length > 0) {
                await Credly.insertMany(newBadges);

            } else {
                console.log('No new badges to insert.');
            }
        }
        else{
            next();
        }
    } catch (error) {
        console.error("Error fetching and saving badges:", error);
    }
}

async function validatecert(username, filename) {
    const validateUrl = 'http://127.0.0.1:5000/validate-certificate'; // Flask endpoint for validation

    // Construct the request data
    const requestData = {
        username: username,
        filename: username+'-'+filename
    };

    try {
        // Validate the uploaded PDF
        const validateResponse = await fetch(validateUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!validateResponse.ok) {
            throw new Error(`Validation failed with status: ${validateResponse.status}`);
        }

        const result = await validateResponse.json();
        console.log('Validation result:', result);

        // Process the result
        if (result.result === "Real") {
            return [result.result, null];
        } else if (result.result === "Fake") {
            return [result.result, result["Edited_By"]];
        } else {
            throw new Error('Unexpected result format');
        }

    } catch (error) {
        console.error('Error:', error);
        return [null, null]; // Return nulls or handle the error as needed
    }
};

async function checkToken(req, res, next) {
    let token;
    let interfaceType;

    // Determine the source of the token and interface (body for Mobileapp, cookies for Webapp)
    if (req.body.Token && req.body.interface) {
        // Mobileapp request (fetching from body)
        token = req.body.Token;
        interfaceType = req.body.interface;
    } else if (req.cookies && req.cookies.Token) {
        // Webapp request (fetching from cookies)
        token = req.cookies.Token;
        interfaceType = "Webapp"; // Default to Webapp if using cookies
    } else {
        // Token or interface missing in both Webapp and Mobileapp
        return res.redirect("/loginpage")
    }


    try {
        // For Webapp, we need to decode the token (JWT), for Mobileapp, we use the raw token
        let decodedToken;
        if (interfaceType === "Webapp") {
            decodedToken = jwt.verify(token, serverSK); // Decode JWT for Webapp
            token = decodedToken.userId; // Use the userId as the token to query the database
        }

        // Fetch the token data from the database
        const token_data = await CSRFToken.findOne({ token });
        if (!token_data) {
            return res.status(400).json({ message: "Invalid token" });
        }

        // Log user's IP
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }

        // Check token age and validity based on interface
        const tokenAgeDays = (Date.now() - token_data.createdAt) / (1000 * 60 * 60 * 24); // age in days
        const tokenAgeMinutes = (Date.now() - token_data.createdAt) / (1000 * 60); // age in minutes

        if (interfaceType === "Mobileapp") {
            if (tokenAgeDays > 30) {
                logMessage(`[=] Mobileapp ${userIP} : Token for user ${token_data.username} has expired`);
                await CSRFToken.deleteOne({ token: token_data.token });
                return res.status(400).json({ message: "token expired" });
            }
        } else if (interfaceType === "Webapp") {
            if (tokenAgeMinutes > 15) {
                logMessage(`[=] Webapp ${userIP} : Token for user ${token_data.username} has expired`);
                await CSRFToken.deleteOne({ token: token_data.token });
                return res.status(400).json({ message: "token expired" });
            }
        }

        next();
    } catch (error) {
        console.log("Error processing token:", error.message);
        return res.status(400).json({ message: "Invalid token or error during token verification" });
    }
}

const fetchUser = async (req, res) => {
    try {
        // Retrieve the token from the cookie
        const token = req.cookies.Token;

        // If token exists
        if (token) {
            // Decode the token using your secret key
            const decoded = jwt.verify(token, serverSK);

            // Check if the decoded token has the required userId (note: case-sensitive)
            if (decoded && decoded.userId) {
                // Look for the token in the CSRFToken collection by the token (uniqueId)
                const tokenData = await CSRFToken.findOne({ token: decoded.userId });

                if (tokenData) {
                    // Now, check if the username in the tokenData matches the one in the decoded token
                    if (tokenData.username === decoded.username) {
                        // Return the username if it matches
                        return tokenData.username;
                    } else {
                        // If the username does not match, redirect to login
                        return res.redirect('/loginpage');
                    }
                } else {
                    // If no matching token is found in the database, redirect to login
                    return res.redirect('/loginpage');
                }
            } else {
                // If the decoded token does not have a valid userId, redirect to login
                return res.redirect('/loginpage');
            }
        } else {
            // If no token is present, redirect to login page
            return res.redirect('/loginpage');
        }
    } catch (error) {
        logMessage(`[*] Internal server error : ${error} `);
        return res.redirect('/loginpage');
    }
};

server.set("view engine", "ejs");
server.set("views", path.join(__dirname, "views"));
server.use(express.static(path.join(__dirname, "public")));
const directoryPath = path.join(__dirname, "uploads");
server.use('/uploads', express.static(directoryPath));
server.use(express.urlencoded({ extended: true }));
server.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        const uploadDir = `uploads/${req.body.up_username}`;
        fs.mkdirSync(uploadDir, { recursive: true });
        callback(null, uploadDir);
    },
    filename: (req, file, callback) => {
        // Replace spaces with underscores in the file name
        const originalName = file.originalname.replace(/\s+/g, '_');
        const newFilename = req.body.up_username + "-" + originalName;
        console.log("Filename:", newFilename);
        callback(null, newFilename);
    }
});
const upload = multer({ storage: storage });

const hashtag_storage = multer.diskStorage({
    destination: (req,file,callback) =>
    {
        const hashtag_file = `hashtag_extractions/`;
        fs.mkdirSync(hashtag_file, {recursive: true});
        callback(null,hashtag_file);
    },
    filename: (req,file,callback) => 
    {
        callback(null,req.body.up_username+"-"+file.originalname);
    }
});
const extract_hashtag_folder = multer({storage : hashtag_storage});

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

// Initialize multer with the modified storage configuration
const profile_pic_upload = multer({ storage: user_profilepic });


// ----------------------------------------------------------------------------------- WEB SITE ROUTES *************** START
server.get("/loginpage", (req,res) =>{
    res.status(200).render("login")
});

server.get("/dashboard",checkToken , async(req,res)=>{
    const username = await fetchUser(req,res);
    console.log("username is ", username);
    res.status(200).render('index', {username : username})
});

server.get("/profile-web-page", checkToken, async (req, res) => {
    console.log("HERE");
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Normalize userIP
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    try {
        // Fetch the username from the token
        const username = await fetchUser(req, res);

        // Fetch user data
        const userProfile = await User.findOne({ username: username });
        if (!userProfile) {
            console.log("no user profile for ", username);
            return res.redirect('/loginpage'); // Redirect if user not found
        }

        // Fetch bio data and profile
        const user_bio_data = await User.findOne({ username: username });
        const user_profile = await Profiles.findOne({ username: username });

        // Fetch certificate data
        const certificateData = await Profiles.find({ username: username }); // Adjust this query as per your database structure

        // Format certificate data for display
        const formattedCertificateData = formatCertificateData(certificateData);

        // Check for missing mandatory fields
        const mandatoryFields = [
            'firstname',
            'lastname',
            'phone_number',
            'dob',
            'bio',
            'college',
            'academic_year',
            'semester',
            'cgpa',
            'hobby',
        ];

        const missingFields = mandatoryFields.filter(field => !userProfile[field]);
        const Credly_there = await Credly.findOne({ username: username });
        let link;
        if (Credly_there) {
            link = Credly_there.link;
        }

        // Render the profile page with user data, certificate data, and missing fields
        return res.render('profile', {
            userProfile,
            user_bio_data,
            user_profile,
            missingFields,
            link,
            certificateData: formattedCertificateData // Send formatted certificate data
        });
        
    } catch (error) {
        logMessage("[*] Webapp ", userIP, " : Error fetching profile =", error.message);
        return res.redirect('/loginpage'); // Redirect on error
    }
});

// Function to format the certificate data
function formatCertificateData(data) {
    if (!data || !Array.isArray(data)) return []; // Return empty array if no data is found

    return data.map(cert => {
        return {
            pdfLink: cert.file, // Assuming the PDF file path is stored in 'file'
            postDesc: cert.post_desc, // Assuming the post description is stored in 'post_desc'
            hashtags: cert.hashtags || [], // Ensure hashtags is an array
            status: cert.approved ? (cert.real ? 'Approved' : 'Rejected') : 'Pending' // Derive status based on conditions
        };
    });
}



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
            fetchAndSaveBadges(mobile_token_check.username);
            logMessage(`[=] Mobileapp ${userIP} : Token for user ${mobile_token_check.username} is valid`);
            console.log("token found");
            return res.status(200).json({ message : "valid" ,user_type : user.user_type });
        }
    }
    catch (e)
    {
        logMessage(`[*] Mobile token checking error ${e}`);
        return res.status(200).json({ message : "Internal Server Error"});
    }
});


server.post("/login", async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    
    const { userUsername, userPwd, mobiletoken, interface } = req.body; 

    // Set the interface to "Webapp" if it is not provided
    const interfaceType = interface || "Webapp"; 

    if (userUsername) {    
        logMessage(`[=] User ${userUsername} attempting to log in`);
    }

    try {
        // Use interfaceType instead of interface in your existing conditions
        if (interfaceType === "Webapp") {

            const user = await User.findOne({ username: userUsername });

            if (!user || user.password !== userPwd) {
                logMessage(`[-] ${interfaceType} ${userIP} : Unsuccessful login attempt for user ${userUsername}`);
                return res.status(401).json({ message: "Invalid username or password" });
            }

            logMessage(`[=] ${interfaceType} ${userIP} : User ${userUsername} successfully logged in`);

            const uniqueId = uuidv4();

            // Include userId, username, and interface in the payload
            const payload = jwt.sign({
                userId: uniqueId,       // Unique ID for the token
                username: userUsername, // Username of the user
                interface: "Webapp"     // Interface type (Webapp or Mobileapp)
            }, serverSK, { expiresIn: "15m" });
            
            const check_token_DB = await CSRFToken.findOne({ username: userUsername });
            if (check_token_DB) {
                await CSRFToken.deleteOne({ username: userUsername });
            }
            
            logMessage(`[=] ${interfaceType} ${userIP} : Token provided for user ${userUsername}`);
            
            // Save the token data in the CSRFToken collection
            const token_Data = new CSRFToken({
                token: uniqueId,         // Use uniqueId as the token in the database
                username: userUsername,  // Save the username
                interface: "Webapp"      // Save the interface type
            });
            await token_Data.save();
            
            // Send the JWT as a cookie
            res.cookie("Token", payload, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Set to true if serving over HTTPS
                maxAge: 15 * 60 * 1000 // 15 minutes
            });
            if(await Credly.findOne({username : userUsername}))
            {
                fetchAndSaveBadges(userUsername);
            }
            const userProfile = await User.findOne({ username: userUsername });
            const mandatoryFields = [
                'firstname',
                'lastname',
                'phone_number',
                'dob',
                'bio',
                'college',
                'academic_year',
                'semester',
                'cgpa',
                'hobby',
            ];

            // Check for missing mandatory fields
            const missingFields = mandatoryFields.filter(field => !userProfile[field]);

            if (missingFields.length > 0) {
                console.log("Going to profile page")
                return res.redirect('/profile-web-page');
            } else {
                console.log("Going to dash page")
                return res.redirect('/dashboard');
            }

        } 
        else if (interfaceType === "Mobileapp" && typeof mobiletoken === 'string') {
            console.log("Mobile app auto-login block");

            const mobile_token_check = await CSRFToken.findOne({ token: mobiletoken });
            
            if (!mobile_token_check) {
                console.log("Mobile token not found");
                return res.status(401).json({ message: "No token found" });
            }

            const user = await User.findOne({ username: mobile_token_check.username });
            const tokenAge = (Date.now() - mobile_token_check.createdAt) / (1000 * 60 * 60 * 24);
            
            if (tokenAge > 30) {
                console.log("Token expired");
                logMessage(`[=] Mobileapp ${userIP} : Token for user ${mobile_token_check.username} has expired`);
                await CSRFToken.deleteOne({ token: mobile_token_check.token });
                return res.status(400).json({ message: "expired" });
            }

            fetchAndSaveBadges(mobile_token_check.username);
            logMessage(`[=] Mobileapp ${userIP} : Token for user ${mobile_token_check.username} is valid`);
            console.log("Token found and is valid");

            return res.status(200).json({ message: "valid", user_type: user.user_type });
        } 
        else if (interfaceType === "Mobileapp" && !mobiletoken) {
            console.log("Mobile app login with username and password");

            const user = await User.findOne({ username: userUsername });

            if (!user || user.password !== userPwd) {
                logMessage(`[-] ${interfaceType} ${userIP} : Unsuccessful login attempt for user ${userUsername}`);
                return res.status(401).json({ message: "Invalid username or password" });
            }

            logMessage(`[=] ${interfaceType} ${userIP} : User ${userUsername} successfully logged in`);

            const uniqueId = uuidv4();
            const payload = jwt.sign({ userId: uniqueId }, serverSK, { expiresIn: "15m" });

            const check_token_DB = await CSRFToken.findOne({ username: userUsername });
            if (check_token_DB) {
                await CSRFToken.deleteOne({ username: userUsername });
            }

            logMessage(`[=] ${interfaceType} ${userIP} : Token provided for user ${userUsername}`);
            const LLT = uuidv4();
            const token_Data = new CSRFToken({
                token: LLT,
                username: userUsername,
                interface: "Mobileapp"
            });
            await token_Data.save();
            return res.status(200).json({ message: "Login successful", token: LLT, userType: user.user_type });
        } 
        else {
            console.log("No matching condition, fallback block");
            return res.status(400).json({ message: "Invalid request" });
        }

    } catch (error) {
        logMessage("[*] Database connection failed: " + error.message);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


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


server.post("/register", async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    const credlylink_template = "https://www.credly.com/users/"
    
    const { firstname , lastname, email , ph_no , reguserUsername, reguserPwd, confuserPwd,credlylink, interface } = req.body;

    const specialCharRegex = /[!@#\$%\^&\*\(\)_\-=+]/;
    const passwordMinLength = 8;

    const existingUser = await User.findOne({ username: reguserUsername });
    if (existingUser) {
        return res.status(400).json({message : "Username already exists "})
    }

    if (reguserPwd.length < passwordMinLength) {
        return res.status(400).json({message :"Password should be at least 8 characters long."});
    }
    if (reguserPwd !== confuserPwd) {
        return res.status(400).json({message : "Passwords do not match."});
    }

    if(interface == "Webapp"){
        const newUser = new User({
            username: reguserUsername,
            password: reguserPwd,
            email : email,
            user_type: "Student",
        });
        await newUser.save();
        logMessage(`[=] ${interface} ${userIP} : New student registered: ${reguserUsername}`);
        return res.status(200).redirect("/loginpage");
    }
    if(interface == "Mobileapp")
        try {
            if (credlylink.toLowerCase().includes(firstname.toLowerCase()) && 
                credlylink.toLowerCase().includes(lastname.toLowerCase()) &&
                credlylink.toLowerCase().includes(credlylink_template)) {

                const response = await axios.get('http://localhost:5000/fetch-badges', {
                    params: { url: credlylink }
                });

                // Handle the response data
                console.log('Badges data:', response.data);

                const badgeDataArray = response.data;

                // Insert each badge data into the database-+
                for (const badge of badgeDataArray) {
                    try {
                        const newBadge = new Credly({
                            firstname: firstname,
                            lastname: lastname,
                            username : reguserUsername,
                            link: credlylink,
                            issuer_name: badge.issuer_name,
                            cert_name: badge.certificate_name,
                            issue_date: badge.issued_date
                        });

                        await newBadge.save();
                    } catch (error) {
                        console.error("badges error : "+error)
                    }
                } 
                
            } else {
                res.status(400).json({ message: 'Invalid credlylink' });
            }
            const newUser = new User({
                    username: reguserUsername,
                    password: reguserPwd,
                    email : email,
                    user_type: "Student",
                    firstname: firstname,
                    lastname: lastname,
                    phone_number: ph_no,
                });        
                await newUser.save(); 

        } catch (error) {
            logMessage(`[*] ${interface} ${userIP} : Error fetching badges `);
            res.status(500).json({ message: 'Failed to fetch and save badges data' });
        }

    logMessage(`[=] ${interface} ${userIP} : New student registered: ${reguserUsername}`);
    return res.status(201).json({ message: "User registered successfully" });
});

server.post("/changeprofile",checkToken,profile_pic_upload.single('file'),  async (req, res) => {
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
        photo, 
        credly,
        interface 
    } = req.body;

    
    console.log("Token:", Token, "Email:", changeemail, "Password:", changepwd, "PhoneNo:", changephoneno);

    if (!Token) {
        const raw_token = req.cookies.Token;

        if (!raw_token) {
            return res.status(400).json({ message: "Token is required." });
        }

        try {
            // Verify and decode the token using serverSK
            const decodedToken = jwt.verify(raw_token, serverSK);

            // Extract userId from the decoded token
            Token = decodedToken.userId;
        } catch (error) {
            console.log("Error decoding token:", error.message);
            return res.status(400).json({ message: "Invalid or expired token." });
        }
    }

    // Check if the token is provided
    if (Token) {
        const tokencheck = await CSRFToken.findOne({ token: Token });

        // Validate token
        if (!tokencheck || tokencheck.token !== Token) {
            logMessage(`[-] ${interface} ${userIP} : Invalid token provided for changing user data. Token: ${Token}`);
            return res.status(400).json({ message: "Invalid token" });
        }
    }
    
    const tokencheck = await CSRFToken.findOne({ token: Token });

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (changeemail && !emailRegex.test(changeemail)) {
        logMessage(`[-] ${interface} ${userIP} : Failed to update profile. Invalid email format. Token: ${Token}`);
        return res.status(400).json({ message: "Invalid email format." });
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (changepwd && !passwordRegex.test(changepwd)) {
        logMessage(`[-] ${interface} ${userIP} : Failed to update profile. Weak password. Token: ${Token}`);
        return res.status(400).json({
            message: "Password must be at least 8 characters long, and contain at least one symbol, one uppercase letter, one lowercase letter, and one number."
        });
    }

    // Phone number length validation
    const phoneRegex = /^\d{10,11}$/;
    if (changephoneno && !phoneRegex.test(changephoneno)) {
        logMessage(`[-] ${interface} ${userIP} : Failed to update profile. Invalid phone number. Token: ${Token}`);
        return res.status(400).json({ message: "Invalid phone number." });
    }

    // Additional validation can be done here (e.g., validating GitHub, website URL, etc.)

    // If all validations pass
    try {
        // Update the user data
        await User.updateOne(
            { username: tokencheck.username },
            {
                $set: {
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
                }
            },
            { upsert: true }
        );

        if (credly) {
            const credlylink_template = "https://www.credly.com/users/";
            
            // Validate that the credly link is valid
            if (credly.toLowerCase().includes(firstName.toLowerCase()) && 
                credly.toLowerCase().includes(lastName.toLowerCase()) &&
                credly.toLowerCase().includes(credlylink_template)) {

                const response = await axios.get('http://localhost:5000/fetch-badges', {
                    params: { url: credly }
                });

                const badgeDataArray = response.data;

                // Insert each badge into the database
                for (const badge of badgeDataArray) {
                    try {
                        const newBadge = new Credly({
                            firstname: firstName,
                            lastname: lastName,
                            username: tokencheck.username,
                            link: credly,
                            issuer_name: badge.issuer_name,
                            cert_name: badge.certificate_name,
                            issue_date: badge.issued_date
                        });

                        await newBadge.save();
                        logMessage(`[=] ${interface} ${userIP} : ${tokencheck.username} fetched and saved credyl badges `)
                    } catch (error) {
                        console.error("Badge saving error:", error);
                    }
                }
            } else {
                return res.status(400).json({ message: 'Invalid Credly link.' });
            }
        }

        // Delete the used token
        await CSRFToken.deleteOne({ token: Token });
        logMessage(`[=] ${interface} ${userIP} : ${tokencheck.username} updated their profile.`)
        return res.status(200).json({ message: "Update successful." });

    } catch (e) {
        logMessage(`[*] Internal server error: ${e}`);
        return res.status(500).json({ message: "Internal server error" });
    }
});


server.post('/upload',upload.single('file'), async (req, res) => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        const userIP = response.data.ip;
        const { Token, up_username, post_type, post_desc, filename, interface } = req.body;
        let { hashtags } = req.body;

        // Handle `hashtags` whether it is a string or an array
        if (typeof hashtags === 'string') {
            hashtags = hashtags.split(',').filter(tag => tag.trim() !== '');
        }

        // Ensure hashtags is an array
        if (!Array.isArray(hashtags)) {
            return res.status(400).json({ message: "Invalid hashtags format" });
        }

        const tokencheck = await CSRFToken.findOne({ token: Token });
        if (!tokencheck || up_username !== tokencheck.username) {
            return res.status(400).json({ message: "Invalid Token or Username" });
        }

        const user_data = await User.findOne({ username: up_username });
        if (!user_data) {
            return res.status(404).json({ message: "User not found" });
        }

        const sanitizedFilename = filename.replace(/\s+/g, '_');
        const filePath = `uploads/${up_username}/${up_username}-${sanitizedFilename}`;

        if (post_type === "post") {
            // Convert PDF to images
            const opts = {
                format: 'jpeg',
                out_dir: path.dirname(filePath),
                out_prefix: path.basename(filePath, path.extname(filePath)),
                page: null // Convert all pages
            };

            pdf.convert(filePath, opts)
                .then(async() => {
                    // Rename the files with sequential numbers
                    const renameFiles = (directory, baseName) => {
                        fs.readdir(directory, (err, files) => {
                            if (err) {
                                console.error('Error reading directory:', err);
                                return;
                            }

                            const imageFiles = files.filter(file => file.startsWith(baseName) && file.endsWith('.jpeg'));
                            imageFiles.sort();

                            imageFiles.forEach((file, index) => {
                                const oldPath = path.join(directory, file);
                                const newPath = path.join(directory, `${baseName}-${index + 1}.jpeg`);
                                fs.rename(oldPath, newPath, err => {
                                    if (err) {
                                        console.error('Error renaming file:', err);
                                    } else {
                                        // File renamed successfully
                                    }
                                });
                            });
                        });
                    };

                    renameFiles(opts.out_dir, opts.out_prefix);

                    // Collect paths of image files
                    const uploadDir = path.join(__dirname, `uploads/${up_username}/`);

                    const imagePaths = fs.readdirSync(uploadDir)
                        .filter(file => file.startsWith(opts.out_prefix) && file.endsWith('.jpg'))
                        .map(file => path.join(`uploads/${up_username}/`, file));

                    const cleanedHashtags = hashtags.map(tag => tag
                        .replace(/[^a-zA-Z0-9\s]/g, ' ')  // Replace all non-alphanumeric characters with space
                        .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
                        .trim()  // Remove leading and trailing spaces
                    );
                    console.log("Cleaned:", cleanedHashtags);
                    const brokenTags = cleanedHashtags.flatMap(tag => tag.split(' ')).filter(word => word.length > 0);
                    console.log("Broken:", brokenTags);

                    const [model_result, producer] = await validatecert(up_username, sanitizedFilename);

                    if (model_result == 'Real') {
                        const newpost = new Profiles({
                            firstname: user_data.firstname,
                            lastname: user_data.lastname,
                            username: up_username,
                            postID: `${up_username}-${uuidv4()}`,
                            file: filePath, // Store the PDF file path
                            imagePaths: imagePaths, // Store the array of image paths
                            post_type: post_type,
                            post_desc: post_desc,
                            post_likes: 0,
                            hashtags: cleanedHashtags,
                            broken_tags: brokenTags,
                            approved: false,
                            interface: interface,
                            embedding : null,
                            model_approved: true,
                            real: true,
                            edited_by: producer
                        });
                        await newpost.save();
                        logMessage(`[=] ${interface} ${userIP} : Posted a file ${up_username}-${filename}`);
                        return res.status(200).json({ message: "Uploaded Successfully" });

                    } else if (model_result == 'Fake') {
                        const newpost = new Profiles({
                            firstname: user_data.firstname,
                            lastname: user_data.lastname,
                            username: up_username,
                            postID: `${up_username}-${uuidv4()}`,
                            file: filePath, // Store the PDF file path
                            imagePaths: imagePaths, // Store the array of image paths
                            post_type: post_type,
                            post_desc: post_desc,
                            post_likes: 0,
                            hashtags: cleanedHashtags,
                            broken_tags: brokenTags,
                            approved: false,
                            interface: interface,
                            model_approved: true,
                            real: false,
                            edited_by: producer,
                        });

                        await newpost.save();
                        logMessage(`[=] ${interface} ${userIP} : Posted a file ${up_username}-${filename}`);
                        return res.status(200).json({ message: "Uploaded Successfully" });

                    } else {
                        return res.status(500).json({ error: 'Unknown validation result' });
                    }

                })
                .catch(error => {
                    console.error('Error converting PDF to images:', error);
                    return res.status(500).json({ message: "Error converting PDF to images" });
                });

        } else if (post_type === "mentor_file_upload") {
            // Handle other file upload types
            addMentees(up_username, req.file.filename, post_desc, selection, userIP, interface);
        }

    } catch (error) {
        console.error(`[*] Internal server error: ${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
});

server.post("/getUserProfile", checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const token = req.body.Token; // Adjust token extraction as needed
    const tokencheck = await CSRFToken.findOne({ token });

    if (tokencheck) {
        try {
            const userAccountData = await User.findOne({ username: tokencheck.username });
            if (!userAccountData) {
                return res.status(404).json({ message: "User not found" });
            }

            // Construct the user profile object
            const userProfile = {
                password: userAccountData.password,
                email: userAccountData.email,
                phone_number: userAccountData.phone_number,
                bio: userAccountData.bio,
                dob: userAccountData.dob,
                college: userAccountData.college,
                academicYear: userAccountData.academicYear,
                semester: userAccountData.semester,
                cgpa: userAccountData.cgpa,
                hobby: userAccountData.hobby,
                github: userAccountData.github,
                website: userAccountData.website,
            };
            console.log("user profile : ", userProfile);

            logMessage(`[=] ${req.body.interface} ${userIP} : ${tokencheck.username} retrieved profile data`);
            res.status(200).json(userProfile);
        } catch (error) {
            logMessage(`[*] ${req.body.interface} ${userIP} : Internal server error ${error}`);
            res.status(500).json({ message: "Internal server error" });
        }
    } else {
        res.status(400).json({ message: "Invalid Token" });
    }
});

server.get("/myprofile",checkToken, async(req,res)=> {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
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


server.post('/deletePost', checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    const { Token, postID, interface } = req.body;
  
    const token_check = await CSRFToken.findOne({token : Token});
    const username = token_check.username;

    const profilesdata = await Profiles.findOne({ username : username , postID : postID});

    if(profilesdata)
    {
        try {
            await Profiles.deleteOne({ postID: postID });
            logMessage(`[=] ${interface} ${userIP} : Deleted post ${postID}`);

            // Step 2: Delete the associated files
            const uploadsDir = path.join(__dirname, `uploads/${username}/`); // Adjust the path as needed

            // Function to delete a file
            const deleteFile = (filePath) => {
              fs.unlink(filePath, (err) => {
                if (err) {
                  logMessage(`[*] ${interface} ${userIP} : Error deleting file ${filePath} - ${err}`);
                } else {
                  logMessage(`[=] ${interface} ${userIP} : Deleted file ${filePath}`);
                }
              });
            };
        
            // Delete the PDF file and images
            const files = fs.readdirSync(uploadsDir);
            files.forEach((file) => {
              if (file.includes(postID)) {
                const filePath = path.join(uploadsDir, file);
                deleteFile(filePath);
              }
            });
          res.status(200);
        } catch (error) {
          logMessage('[*] Error deleting post:', error);
          res.status(500).json({ message: 'Error deleting post' });
        }
    }
    else{
        logMessage(`[-] ${interface} ${userIP} : Treid to delete no existing post ${postID}`);
    }
  });


server.post("/mybatches",checkToken , async(req,res) =>{
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    const {Token , username , interface} = req.body;
    if(Token)
    {
        try
        {
            tocken_check = await CSRFToken.findOne({ token : Token});
            if (tocken_check.username == username )
            {
                const batches = await Mentor.find({mentor : username})
                if (batches.length > 0 )
                {
                    res.status(200).json({ data: batches });
                    logMessage(`${interface} ${userIP} : Mentor ${username} fetch their badges info`);
                }
                else
                {
                    res.status(201);
                }
            }
        }
        catch(e)
        {
            logMessage(`${interface} ${userIP} : Internal server error : ${e}`);
            res.status(500);
        }
    }
    

});

server.post('/delete-batch',checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;


    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const { username, batchName,Token } = req.body; // Extract username and batchName from request body
    if (Token) 
    {    

        try {
            tocken_check = await CSRFToken.findOne({ token : Token})
            if (tocken_check.username == username )
            {// Find and delete the batch for the given username and batch name
                const result = await Mentor.findOneAndDelete({
                    mentor: username,
                    batch: batchName
                });

                if (result) {
                    logMessage(`[=] ${userIP} : ${username} deleted thier batch`);
                    res.status(200).json({ message: 'Batch deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Batch not found' });
                }
            }
        } catch (error) {
            logMessage(`[*] ${userIP} : Internal server error while delteing batch :${error}`);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
});


server.post("/extract-hashtags", extract_hashtag_folder.single('file'), async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    const { Token, interface, filename, up_username } = req.body;
    console.log("Token:", Token, "interface:", interface, "Filename:", filename, "username:", up_username);
    const filePath = req.file.path;

    try {
        const flaskResponse = await axios.post('http://localhost:5000/autohash', {
            filePath: filePath,
            mode: "pdf"
        });
        const hashtags = flaskResponse.data.hashtags;

        if (!hashtags || hashtags.length === 0) {
            const opts = {
                format: 'jpeg',
                out_dir: path.join(__dirname, 'hashtag_extractions'),
                out_prefix: `${path.basename(filePath, path.extname(filePath))}`,
                page: 1 // Only convert the first page
            };

            if (!fs.existsSync(opts.out_dir)) {
                fs.mkdirSync(opts.out_dir, { recursive: true });
            }

            await pdf.convert(filePath, opts);
            console.log("First page of PDF converted to image successfully");

            const imageFiles = fs.readdirSync(opts.out_dir)
                .filter(file => file.startsWith(opts.out_prefix) && file.endsWith('.jpeg'))
                .sort();

            if (imageFiles.length > 0) {
                const oldPath = path.join(opts.out_dir, imageFiles[0]);
                const newPath = path.join(opts.out_dir, `${opts.out_prefix}-1.jpeg`);
                fs.renameSync(oldPath, newPath);
                console.log(`Renamed ${imageFiles[0]} to ${opts.out_prefix}-1.jpeg \n NEWPATHS ${newPath}`);

                // Call the Flask OCR function with the image path for further hashtag extraction
                const ocrResponse = await axios.post('http://localhost:5000/autohash', {
                    filePath: newPath,
                    mode: "image"
                });

                const ocrHashtags = ocrResponse.data.hashtags || [];
                return res.status(200).json(ocrHashtags);
            } else {
                console.error('No image file was created.');
                return res.status(500).json({ message: 'Failed to create image for OCR' });
            }
        }
        return res.status(200).json(hashtags);

    } catch (error) {
        console.error('Error communicating with Flask server:', error);
        return res.status(500).json({ message: 'Failed to extract hashtags' });
    }
});


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
            if(status == "approved")
            {
                try {

                    const result = await Profiles.findOneAndUpdate(
                      { postID: postId }, 
                      { $set: { approved: true } }, 
                      { new: true } 
                    );
                
                    if (!result) {
                      return res.status(404).json({ message: 'Post not found' });
                    }
                    logMessage(`[=] ${interface} ${userIP} : ${up_username} approved post ${postId}`)
                    return res.status(200).json({ message: 'Post approved successfully'});
                  } catch (error) {
                    logMessage(`[*] Internal Server error : failed to approved post :${error}`)
                    return res.status(500).json({ message: 'Internal Server error' });
                  }
            }
            else if (status == 'rejected')
            {
                try {
                    console.log("REJECTED : ",postId);
                    await Profiles.deleteOne({postID : postId});
                    logMessage(`[=] ${interface} ${userIP} : ${up_username} rejected post ${postId}`);
                    return res.status(200).json({ message: 'Post rejected successfully'});
                } catch (error) {
                    logMessage(`[*] Internal Server error : rejected post ${postId} ,error ${error}`);
                    return res.status(200).json({ message: 'Internal Server error'});
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

        console.log(responseData);
        res.status(200).json(responseData); // Return the array of profiles
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



server.listen(8000, () => {
    console.log(`http://localhost:8000`);
  });


// this third comment