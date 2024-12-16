const jwt = require('jsonwebtoken');
const { CSRFToken } = require('../models/csrfttoken');  // Assuming CSRFToken model is defined somewhere
const {logMessage} = require('./logger'); 

const serverSK = process.env.SERVER_SEC_KEY;

const fetchUser = async (req, res) => {
    try {
        const token = req.cookies.Token;

        if (token) {
            const decoded = jwt.verify(token, serverSK);
            if (decoded && decoded.userId) {
                return decoded.username;
            } else {
                logMessage("Decoded data invalid in fetchUser util");
                return res.redirect('/loginpage'); // Return after sending response
            }
            
        } else if (req.body) {
            return res.body.username;
        }
        else{
            return res.redirect('/loginpage');
        }
    } catch (error) {
        logMessage(`[*] Internal server error : ${error}`);
        return res.redirect('/loginpage');
    }
};

module.exports = { fetchUser };