const express = require('express');
const feedLogicRoute = express.Router();

const Profiles = require("../models/profiles");

feedLogicRoute.get("/feed", async (req, res) => {
  try {
    // Parse 'page' and 'range' from query parameters
    const page = Math.max(parseInt(req.query.page) || 1, 1); // Default to page 1
    const range = parseInt(req.query.range) || 5; // Default range is 5 posts

    const rangeStart = (page - 1) * range; // Calculate starting index

    // Fetch only the required range of posts, sorted by 'createdAt' in descending order
    const feedData = await Profiles.find()
        .select('firstname lastname username post_desc file hashtags') // Only fetch required fields
        .sort({ createdAt: -1 }) // Sort by 'createdAt' field in descending order
        .skip(rangeStart) // Skip posts based on the range
        .limit(range); // Limit the number of posts

    // Optionally, get the total count for pagination UI
    const totalProfiles = await Profiles.countDocuments();
    const totalPages = Math.ceil(totalProfiles / range);

    res.status(200).json({
        data: feedData,
        currentPage: page,
        totalPages,
    });
  } 
  catch (error) {
    res.status(500).send("Error fetching feed data: " + error.message);
}

});

module.exports = feedLogicRoute;
