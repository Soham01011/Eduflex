const axios = require('axios')
const Credly = require('../models/credly')
const User = require('../models/users')

async function fetchAndSaveBadges(userUsername) {
    try {
        // Retrieve user data from Credly and User collections
        const mycredly_data = await Credly.findOne({ username: userUsername });
        const db_user = await User.findOne({ username: userUsername });
        const firstname = db_user.firstname;
        const lastname = db_user.lastname;

        if (!mycredly_data) {
            throw new Error('User not found');
        }
        if(mycredly_data.link){
            const credlylink = mycredly_data.link;
            const response = await axios.get('http://localhost:5000/fetch-badges', {
                params: { url: credlylink }
            });

            const badgeDataArray = response.data;

            // Fetch existing badges for this user from the database
            const existingBadges = await Credly.find({ username: userUsername });

            // Create a set of existing badge identifiers (e.g., certificate name and issue date)
            const existingBadgeIdentifiers = new Set(
                existingBadges.map(badge => `${badge.cert_name}-${badge.issue_date}`)
            );

            // Prepare an array to hold new badges
            const newBadges = [];

            // Identify new badges
            for (const badge of badgeDataArray) {
                const badgeIdentifier = `${badge.certificate_name}-${badge.issued_date}`;
                if (!existingBadgeIdentifiers.has(badgeIdentifier)) {
                    newBadges.push({
                        firstname: firstname,
                        lastname: lastname,
                        username: userUsername,
                        link: credlylink,
                        issuer_name: badge.issuer_name,
                        cert_name: badge.certificate_name,
                        issue_date: badge.issued_date,
                        badge_url: badge.badge_url,
                        image_url: badge.image_url
                    });
                }
            }

            // Insert only new badges into the database
            if (newBadges.length > 0) {
                await Credly.insertMany(newBadges);

            } else {
                console.log('No new badges to insert.');
            }
        }
        else{
            next();
        }
    } catch (error) {
        console.error("Error fetching and saving badges:", error);
    }
}

module.exports = {fetchAndSaveBadges}