const jwt = require('jsonwebtoken');
const CSRFToken  = require('../models/csrfttoken');  // Adjust path according to your file structure
const { logMessage } = require('../utils/logger');  // Assuming logger.js is in utils

const serverSK = process.env.SERVER_SEC_KEY;

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
        return res.redirect("/loginpage");
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
            console.log("invalid token")
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
                console.log("token expired")
                logMessage(`[=] Mobileapp ${userIP} : Token for user ${token_data.username} has expired`);
                await CSRFToken.deleteOne({ token: token_data.token });
                return res.status(400).json({ message: "token expired" });
            }
        } else if (interfaceType === "Webapp") {
            if (tokenAgeMinutes > 15) {
                console.log("token expired")
                logMessage(`[=] Webapp ${userIP} : Token for user ${token_data.username} has expired`);
                await CSRFToken.deleteOne({ token: token_data.token });
                return res.status(400).json({ message: "token expired" });
            }
        }
        next();  // Continue to the next middleware or route handler
    } catch (error) {
        console.log("Error processing token:", error.message);
        return res.status(400).json({ message: "Invalid token or error during token verification" });
    }
}

module.exports = { checkToken };
