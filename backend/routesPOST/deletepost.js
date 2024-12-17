const express = require('express')
const deletepostLogicRoute = express.Router();
const fs = require('fs');

const CSRFToken = require('../models/csrfttoken');
const Profiles = require('../models/profiles');


const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger')

deletepostLogicRoute.post('/deletePost', checkToken, async (req, res) => {
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

module.exports = deletepostLogicRoute;