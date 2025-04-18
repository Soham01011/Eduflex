const jwt = require('jsonwebtoken');
const CSRFToken = require('../models/csrfttoken'); // Adjust path according to your file structure
const { logMessage } = require('../utils/logger'); // Assuming logger.js is in utils

const serverSK = process.env.SERVER_SEC_KEY;

async function checkTokenAndUserType(req, res, next) {
    let token;
    let interfaceType;
    // Determine the source of the token and interface (body for Mobileapp, cookies for Webapp)
    if (req.body?.Token && req.body?.interface) {
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
        // For Webapp, decode the JWT; for Mobileapp, use the token as provided.
        let decodedToken;
        if (interfaceType === "Webapp") {
            decodedToken = jwt.verify(token, serverSK); // Decode JWT for Webapp
            // Use the userId from the decoded token as the token to query the database.
            token = decodedToken.userId;
        }
        // Fetch token data from the database.
        const token_data = await CSRFToken.findOne({ token });
        if (!token_data) {
            console.log("Invalid token");
            return res.status(400).json({ message: "Invalid token" });
        }
        // Log user's IP address (handles proxies)
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (Array.isArray(userIP)) {
            userIP = userIP[0];
        } else if (userIP && userIP.includes(',')) {
            userIP = userIP.split(',')[0].trim();
        }
        // Calculate token age
        const now = Date.now();
        const tokenAgeDays = (now - token_data.createdAt) / (1000 * 60 * 60 * 24); // age in days
        const tokenAgeMinutes = (now - token_data.createdAt) / (1000 * 60); // age in minutes
        // Expiration logic:
        if (interfaceType === "Mobileapp") {
            // For Mobileapp tokens, expire after 30 days.
            if (tokenAgeDays > 30) {
                console.log("Token expired");
                logMessage(`[=] Mobileapp ${userIP} : Token for user ${token_data.username} has expired`);
                await CSRFToken.deleteOne({ token: token_data.token });
                return res.status(400).json({ message: "token expired" });
            }
        } else if (interfaceType === "Webapp") {
            // For Webapp, if the user is a mentor, enforce a 15-minute expiration.
            if (token_data.usertype === "Mentor" && tokenAgeMinutes > 15) {
                console.log("Token expired");
                logMessage(`[=] Webapp ${userIP} : Token for user ${token_data.username} has expired`);
                await CSRFToken.deleteOne({ token: token_data.token });
                return res.status(400).json({ message: "token expired" });
            }
            // (Optional) Add expiration logic for non-mentor webapp users if needed.
        }
        // If the user is a Mentor (and this is a Webapp request), redirect to current path + "-mentor"
        if (interfaceType === "Webapp" && token_data.usertype === "Mentor") {
            const currentPath = req.originalUrl;
            if (!currentPath.endsWith("-mentor")) {
                return res.redirect(`${currentPath}-mentor`);
            }
        }
        // If everything is valid, proceed to the next middleware or route handler.
        next();
    } catch (error) {
        console.log("Error processing token:", error.message);
        return res.redirect("/loginpage");
    }
}

module.exports = { checkTokenAndUserType };
