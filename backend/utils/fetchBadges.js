const axios = require("axios");
const Credly = require("../models/credly");

const {logMessage }= require("./logger")

async function fetchBadges(interface,credly,firstName,lastName,tkusername,userIP){
    if(credly){
        const credlylink_template = 'https://www.credly.com/users/';

        // Validate the Credly link
        if (
            credly.toLowerCase().includes(firstName.toLowerCase()) &&
            credly.toLowerCase().includes(lastName.toLowerCase()) &&
            credly.toLowerCase().includes(credlylink_template)
        ) {
            const response = await axios.get('http://localhost:5000/fetch-badges', {
                params: { url: credly }
            });

            const badgeDataArray = response.data;

            // Insert each badge into the database
            for (const badge of badgeDataArray) {
                try {
                    const newBadge = new Credly({
                        firstname: firstName,
                        lastname: lastName,
                        username: tkusername,
                        link: credly,
                        issuer_name: badge.issuer_name,
                        cert_name: badge.certificate_name,
                        issue_date: badge.issue_date,
                        badge_url: badge.badge_url,
                        image_url: badge.image_url
                    });

                    await newBadge.save();
                    logMessage(
                        `[=] ${interface} ${userIP} : ${tkusername} fetched and saved Credly badges`
                    );
                } catch (error) {
                    console.error('Badge saving error:', error);
                }
            }
        } else {
            return res.status(400).json({ message: 'Invalid Credly link.' });
        }
    }
}

module.exports = {fetchBadges}