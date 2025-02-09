const express = require("express")
const sendforgetmail = express.Router();
const nodemailer = require("nodemailer");
require("dotenv").config();
const { v4: uuidv4, stringify } = require("uuid");

const User = require("../models/users");
const ForgotPwd = require("../models/forogtpwd");

const {logMessage} = require("../utils/logger");

const server_Email = process.env.server_Email;
const server_Email_Pass = process.env.server_Email_Pass;

sendforgetmail.post("/checkforgetmail",async (req,res)=> {
    const usermail = req.body.userEmail;
    if( !(await User.findOne({"email" : usermail})) ){
        return res.status(400).json({message: "Please provide your registered mail id"});
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: server_Email,
          pass: server_Email_Pass,
        },
    });

    const forgotToken = uuidv4();
    const forgotpwdmaildata = new ForgotPwd({
        email : usermail,
        token : forgotToken,
        visited :  false,
    });

    await forgotpwdmaildata.save();

    let locallink = `https://localhost:5000/forgotpwdverify?token=${forgotToken}`
    let globallink = `https://nice-genuinely-pug.ngrok-free.app/forgotpwdverify?token=${forgotToken}`

    const forgotmail = {
        from : server_Email,
        to : usermail,
        subject : "EDUFLEX forogot password",
        text: `Click on the link to update your eduflex password : ${globallink} <br> If Above link dosent work then use this link ${locallink}`
    }

    transporter.sendMail(forgotmail, (error, info) => {
        if (error) {
            logMessage(`[*] Internal Server Error : ${error}`)
            res.status(500).json({message:"Internal Server error"})
          console.error(error);
        } else {
          logMessage(`Email sent: ${info.response}`);
          res.status(200).send("Email sent with link to change the password onyour provided email");
        }
      });

});

module.exports = sendforgetmail;