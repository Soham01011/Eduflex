const express = require('express')
const uploadcretRouter = express.Router();

const {fetchUser} = require('../utils/fetchUser')
const {checkToken} = require('../middleware/checkToken')

uploadcretRouter.get("/upload-certificate",checkToken,async(req,res)=>{
    username = await fetchUser(req,res);
    res.render("upload",{username : username});
});

module.exports = uploadcretRouter;