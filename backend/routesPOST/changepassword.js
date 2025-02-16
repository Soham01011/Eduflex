const express = require("express")
const changepassword = express.Router()

const User = require("../models/users");
const ForgotPwd = require("../models/forogtpwd");

const {logMessage} = require("../utils/logger");

changepassword.post("/changepassword", async(req,res) => {
    const {newPwd , confPwd, token} = req.body;
    console.log(req.body)
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Normalize userIP
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }
    let tokendata = await ForgotPwd.findOne({"token" : token});
    console.log(tokendata)
    try{        
        if (tokendata){
            await User.findOneAndUpdate({"email" : tokendata.email} , {
                    $set:{
                        password: newPwd === confPwd ? newPwd : (() => { throw new Error("Passwords do not match"); })()
                    }
                }, 
                { new: true }
            );
            await ForgotPwd.deleteOne({email: token.email});
        }
        logMessage(`[=] ${userIP} ${tokendata.email} : Password change for this user `)
        res.redirect('/loginpage')
    }
    catch(err){
        logMessage(`[*] Internar server error : ${err}`);
        res.json({message: " ERR !! "});
    }
});

module.exports = changepassword;