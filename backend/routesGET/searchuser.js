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
const User = require("../models/users");
const Pointshistory = require('../models/pointshistory');


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
        let userCredly = await Credly.findOne({"username" : user.username}) || false;
        // Get all badges for the user
        let cert = await Credly.find({"username" : user.username}) || [];
        let userProfile = await Profiles.find({"username": user.username}) || false;
        let userAllskills = await Allskills.findOne({"username" : user.username}) || false;



        if(userProfile){
            userProfile.forEach(profile => {
                delete profile.postID;
            });
        }
        let editable = false
        let user_type = 'guest'
        if (await fetchUser(req,res)== user.username){
            user_type = await User.findOne({"username" : await fetchUser(req,res)});
            user_type = user_type.user_type;
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

        const pointsData = await Pointshistory.find({"username": userData.username}).select("post_type post_subtype points time")

        res.render("searchpage", {
            username: userData.username,
            firstname: userData.firstname || null,
            lastname: userData.lastname || null,
            workplace: userData.college || null,
            userProfile: user,
            link: userCredly ? userCredly.link : null,
            bio: userData.bio || null,
            credlybadges: userCredly || false,
            cert: cert,
            post: userProfile || false,
            userexp: userAllskills ? userAllskills.experience || [] : [],
            useredu: userAllskills ? userAllskills.education || [] : [],
            userAllskills: userAllskills || { skills: [] },
            editable,
            user_type,
            pointsData: pointsData || [],
        });
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
    
});

module.exports = searchuserprofileRoute;
