const express = require('express')
const profilepageRoute = express.Router();

/**
 * fetchUser  : A utility which you can use and fetch the username directly from the 
 *              cookie or the request body (To userstand its working open utils/fetchUser)
 * 
 * checkToken : Check the token given to the user in the session and also checks if 
 *              it is valid or invalid if not then user will be logged out and if 
 *              the token is incorrect then also the user will the redirected to
 *              loginpage (To understand working open middleware,checkToken)
 * 
 * logMessage : A minimal function which logs all the requests to the server make sure 
 *              to understand the format of the logs and do log all the erros and user
 *              activities. This can be useflu for further studies. 
 */

const {fetchUser} = require('../utils/fetchUser')
const {checkToken} = require('../middleware/checkToken')
const {logMessage} = require('../utils/logger')

/**
 * User     : Models of users to fetch their data.
 * 
 * Profiles : Model which stores the user posts.
 * 
 * Credly   : Model which stores credly badges of all the users.
 * 
 * Allskills : Data of the user about their expirence , education and skills
 */
const User = require('../models/users');
const Profiles = require('../models/profiles');
const Credly = require('../models/credly');
const Allskills = require('../models/expeduskill');


/**
 * Steps : 
 *      - Checks the token validity
 *      - fetchs username and then pulls their data
 *      - Formating the data to be display in the json format
 *      - If the user have not enter all the user bio details then it will prompted to fill it
 *      - Render all of the data to the webpage
 */
profilepageRoute.get("/profile-web-page", checkToken, async (req, res) => {
    console.log("here is profile page")
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Normalize userIP
    if (Array.isArray(userIP)) {
        userIP = userIP[0];
    } else if (userIP.includes(',')) {
        userIP = userIP.split(',')[0].trim();
    }

    try {
        // Fetch the username from the token
        const username = await fetchUser(req, res);
        console.log(username);
    
        // Check if user profile exists
        let userProfile = await User.findOne({ username: username });
        if (!userProfile) {
            console.log("Creating new profile for first-time user:", username);
            
            // Create a new profile with default values
            userProfile = new User({
                username: username,
                firstname: '',
                lastname: '',
                phone_number: '',
                dob: '',
                bio: '',
                college: '',
                academic_year: '',
                semester: '',
                cgpa: '',
                hobby: '',
            });
            await userProfile.save();
        }
    
        // Fetch bio data and profile
        const user_bio_data = await User.findOne({ username: username });
        const user_profile = await Profiles.findOne({ username: username });
    
        // Fetch certificate data
        const certificateData = await Profiles.find({ username: username });
    
        // Format certificate data for display
        const formattedCertificateData = formatCertificateData(certificateData);

        // Check for missing mandatory fields
        const mandatoryFields = [
            'firstname',
            'lastname',
            'phone_number',
            'dob',
            'bio',
            'college',
            'academic_year',
            'semester',
            'cgpa',
            'hobby',
        ];
    
        const missingFields = mandatoryFields.filter(field => !userProfile[field]);
    
        const Credly_there = await Credly.findOne({ username: username });
        let link;
        if (Credly_there) {
            link = Credly_there.link;
        }

        const cert = await Credly.find({ username: username });
    
        const userskillsdata = await Allskills.findOne({ username: username });
        const userskills = userskillsdata?.skills || [];
    
        const userexp = (userskillsdata?.experience || []).sort((a, b) => {
            const dateA = new Date(a.endTime || a.startTime);
            const dateB = new Date(b.endTime || b.startTime);
            return dateB - dateA; // Sort in descending order
        });
    
        const useredu = (userskillsdata?.education || []).sort((a, b) => {
            const dateA = new Date(a.endTime || a.startTime);
            const dateB = new Date(b.endTime || b.startTime);
            return dateB - dateA; // Sort in descending order
        });
    

        // Render the profile page with user data, certificate data, and missing fields
        return res.render('profile', {
            userProfile,
            user_bio_data,
            user_profile,
            missingFields,
            link,
            cert,
            certificateData: formattedCertificateData,
            userexp,
            useredu,
            userskills
        });
 
    }
     catch (error) {

        logMessage("[*] Webapp : ", userIP, " : Error fetching profile =", error.message);
        return res.redirect('/loginpage'); // Redirect on error
    }
});

// Function to format the certificate data
function formatCertificateData(data) {
    if (!data || !Array.isArray(data)) return []; // Return empty array if no data is found

    return data.map(cert => {
        return {
            postId : cert.postID,
            pdfLink: cert.file, 
            postDesc: cert.post_desc, 
            hashtags: cert.hashtags || [], // Ensure hashtags is an array
            status: cert.mentor_approved === null ? 'Pending' : // If mentor approval is still pending
                    (cert.approved ? (cert.real ? 'Approved' : 'Rejected') : 'Rejected') // Logic for approved status
        };
    });
};

module.exports = profilepageRoute;