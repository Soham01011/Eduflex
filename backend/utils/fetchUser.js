const jwt = require('jsonwebtoken');
const { CSRFToken } = require('../models/csrfttoken');  // Assuming CSRFToken model is defined somewhere
const {logMessage} = require('./logger'); 

const serverSK  = "RANKING"

const fetchUser = async (req, res) => {
    try {
        const token = req.cookies.Token;

        if (token) {
            const decoded = jwt.verify(token, serverSK);
            if (decoded && decoded.userId) {
                return decoded.username;
            } else {
                console.log("Decoded data invalid");
                return res.redirect('/loginpage'); // Return after sending response
            }
            
        } else {
            return res.redirect('/loginpage');
        }
    } catch (error) {
        logMessage(`[*] Internal server error : ${error}`);
        return res.redirect('/loginpage');
    }
};

module.exports = { fetchUser };