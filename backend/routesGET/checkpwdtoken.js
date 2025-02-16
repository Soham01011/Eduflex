const express =require("express")
const checkforgotpwdtoken = express.Router();

const ForgotPwd = require('../models/forogtpwd');

checkforgotpwdtoken.get("/forgotpwdverify",async(req,res)=> {

    if(await ForgotPwd.findOne({"token" : req.query.token})){
        res.render("changepasswordpage", {  token : req.query.token });
    }
    else{
        res.json({message : "Not valid link"})
    }
});

module.exports = checkforgotpwdtoken;