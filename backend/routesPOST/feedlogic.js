const express = require('express');
const feedLogicRoute = express.Router();

const { checkToken } = require("../middleware/checkToken");
const Profiles = require("../models/profiles");

feedLogicRoute.get("/feed", checkToken, async (req, res) => {
  try {
    // Parse 'page' and 'range' from query parameters
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const range = parseInt(req.query.range) || 4; // Default range is 4

    const rangeStart = (page - 1) * range; // Calculate starting index

    // Fetch only the required fields with projection
    const feedSelect = await Profiles.find()
      .select('firstname lastname username file post_desc hashtags post_likes')
      .skip(rangeStart)
      .limit(range);

    // Optionally, get total count for pagination
    const totalProfiles = await Profiles.countDocuments();
    const totalPages = Math.ceil(totalProfiles / range);

    res.status(200).json({
      data: feedSelect,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = feedLogicRoute;
