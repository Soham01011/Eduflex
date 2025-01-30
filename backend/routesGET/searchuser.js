const express = require('express');
const searchuserprofileRoute = express.Router();

/**
 * fetchUser  : A utility which you can use and fetch the username directly from the 
 *              cookie or the request body (To userstand its working open utils/fetchUser)
 * */

const {fetchUser} = require("../utils/fetchUser");
/**
 * Profiles : a schema which holds user posts data
 * Credly : a schema which holds user credly data
 * Allskills : a schema which holds data like work expirence , education and skills
 * User : a schema which holds all user data
 */
const Profiles = require('../models/profiles');
const Credly = require('../models/credly');
const Allskills = require('../models/expeduskill');
const User = require("../models/users")


/**
 * searchuserprofileRoute : 
 *          This is the search page from where the user data will be returned based on the searchQuery.
 *          It wokr by following steps
 */
searchuserprofileRoute.get('/search-profile/:search_query',async(req,res)=>{
    const searchQuery = req.params.search_query;
    const searchQueryLower = searchQuery.toLowerCase();
    
    if (!searchQuery) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    
    try {
        // Find the first user whose firstname, lastname, or username matches the search query
        let user = await User.findOne({"username" : searchQuery});
        
        if (!user) {
            // If not found by username, check if the query contains a space
            if (searchQueryLower.includes(' ')) {
                // Split the query into firstname and lastname and convert to lowercase
                const [firstname, lastname] = searchQueryLower.split(' ', 2);
                user = await User.findOne({
                    firstname: { $regex: new RegExp(`^${firstname}$`, 'i') },
                    lastname: { $regex: new RegExp(`^${lastname}$`, 'i') }
                });
            } 
        
            if (!user) {
                // If no space or still not found, try searching by firstname (in lowercase)
                user = await User.findOne({
                    firstname: { $regex: new RegExp(`^${searchQueryLower}$`, 'i') }
                });
            } 
        
            if (!user) {
                // If still not found, try searching by lastname (in lowercase)
                user = await User.findOne({
                    lastname: { $regex: new RegExp(`^${searchQueryLower}$`, 'i') }
                });
            }
        }

        if (!user) {
            return res.status(404).json({ error: 'No user found matching the query' });
        }

    
        let userData = await User.findOne({"username" : user.username});
        let userCredly = await Credly.find({"username" : user.username}) || false;
        let userProfile = await Profiles.find({"username": user.username}) || false;
        let userAllskills = await Allskills.findOne({"username" : user.username}) || false;

        if(userProfile){
            userProfile.forEach(profile => {
                delete profile.postID;
            });
        }
        let editable = false

        if (await fetchUser(req,res)== user.username){
            editable = true
        }   

        if(!editable && userProfile){
            userProfile.forEach(profile => {
                delete profile.postID;
            });
        };

        if(!editable && userAllskills){
            userAllskills.education.forEach(skill => {
                delete skill.id
            });
            userAllskills.experience.forEach(skill => {
                delete skill.id
            });
        };

        if (userAllskills) {
            // Sort experience and education by dates (latest first)
            userAllskills.experience = userAllskills.experience.sort((a, b) => {
                const dateA = new Date(a.endTime || a.startTime); // Use endTime if available, else startTime
                const dateB = new Date(b.endTime || b.startTime);
                return dateB - dateA; // Sort in descending order
            });
        
            userAllskills.education = userAllskills.education.sort((a, b) => {
                const dateA = new Date(a.endTime || a.startTime); // Use endTime if available, else startTime
                const dateB = new Date(b.endTime || b.startTime);
                return dateB - dateA; // Sort in descending order
            });
        };

        console.log(userAllskills.education)

        res.render("searchpage",{
            username : userData.username,
            firstname: userData.firstname || null,
            lastname : userData.lastname || null,
            workplace: userData.college || null,
            userProfile: user,
            link : userCredly.link,
            bio: userData.bio || null,
            credlyData: userCredly || false,
            post : userProfile || false,
            userexp: userAllskills.experience || false,
            useredu :userAllskills.education || false,
            editable
        })
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
    
});

module.exports = searchuserprofileRoute;
