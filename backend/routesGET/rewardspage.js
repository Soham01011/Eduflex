const express = require('express');
const RewardsRouter = express.Router();

RewardsRouter.get('/', (req, res) => {
    res.render('rewards');

});

module.exports = RewardsRouter;