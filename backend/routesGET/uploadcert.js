const express = require('express')
const uploadcretRouter = express.Router();


/**
 * fetchUser : A utility which you can use and fetch the username directly from the 
 *             cookie or the request body (To userstand its working open utils/fetchUser)
 * checkToken : Check the token given to the user in the session and also checks if 
 *              it is valid or invalid if not then user will be logged out and if 
 *              the token is incorrect then also the user will the redirected to
 *              loginpage (To understand working open middleware,checkToken)
 */
const {fetchUser} = require('../utils/fetchUser')
const { checkTokenAndUserType } = require('../middleware/checkTokenandUsertype');
/**
 * Steps:
 *      - Checks the token of the user
 *      - fetchs the username of the user
 *      - renders by passing the username for profile pic
 */
uploadcretRouter.get("/upload-certificate",checkTokenAndUserType,async(req,res)=>{
    username = await fetchUser(req,res);
    res.render("upload",{username : username});
});

module.exports = uploadcretRouter;