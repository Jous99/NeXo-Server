const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Account Routes
router.get('/client/account_id', userController.getAccountIdentifier);

// Registration & Auth
router.post('/client/register/redirect', (req, res) => {
    res.json({
        status: "success",
        url: "https://accounts-api-lp1.raptor.network/register"
    });
});

module.exports = router;