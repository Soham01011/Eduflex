const express = require('express');
const mybatchesLogicRoute = express.Router();

const {checkToken} = require('../middleware/checkToken');
const {logMessage} = require('../utils/logger');

const CSRFToken  = require('../models/csrfttoken')
const Mentor     = require('../models/mentees')

mybatchesLogicRoute.post("/mybatches",checkToken , async(req,res) =>{
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

module.exports = mybatchesLogicRoute;