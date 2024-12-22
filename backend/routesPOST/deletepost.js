const express = require('express')
const deletepostLogicRoute = express.Router();
const fs = require('fs');

const CSRFToken = require('../models/csrfttoken');
const Profiles = require('../models/profiles');


const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger')
const {fetchUser} = require('../utils/fetchUser')

deletepostLogicRoute.post('/deletePost', checkToken, async (req, res) => {
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log('pingged the server to delete')
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    const { Token, postID, interface } = req.body;
    let username ='';

    if (Token){
      const token_check = await CSRFToken.findOne({token : Token});
      username = token_check.username;
    }
    
    if(!Token){
      username = await fetchUser(req,res);
    }
    console.log("USER NAME :", username , " POST ID TO DEL" ,postID)

    const profilesdata = await Profiles.findOne({ username : username , postID : postID});

    if(profilesdata)
    {
        try {
            await Profiles.deleteOne({ postID: postID });
            logMessage(`[=] ${interface} ${userIP} : Deleted post ${postID}`);

            res.status(200).json({"message": "Deleted post successfully"});
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