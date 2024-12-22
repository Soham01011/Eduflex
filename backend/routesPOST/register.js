const express = require('express')
const registerLogicRoute = express.Router();
const axios = require('axios');

const User = require('../models/users');
const Credly = require('../models/credly');

const {logMessage} = require('../utils/logger');

registerLogicRoute.post("/register", async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    const credlylink_template = "https://www.credly.com/users/"
    
    const { firstname , lastname, email , ph_no , reguserUsername, reguserPwd, confuserPwd,credlylink, interface } = req.body;

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
                credlylink.toLowerCase().includes(credlylink_template) &&
                process.env.USE_CREDLY_BADGES) // this is added to check if the feature is enabled or not 
                {

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

module.exports = registerLogicRoute;