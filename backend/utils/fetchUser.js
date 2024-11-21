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
                const tokenData = await CSRFToken.findOne({ token: decoded.userId });

                if (tokenData) {
                    if (tokenData.username === decoded.username) {
                        return tokenData.username;
                    } else {
                        return res.redirect('/loginpage');
                    }
                } else {
                    return res.redirect('/loginpage');
                }
            } else {
                return res.redirect('/loginpage');
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