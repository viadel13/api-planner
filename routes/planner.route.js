const express = require('express');
const plannerController = require('../controller/planner.controller');
const router = express.Router();

router.post('/register', plannerController.authentKey, plannerController.register);
router.get('/set-password/:token', plannerController.setPassword);
router.get('/save-user', plannerController.saveUser);
router.delete('/delete/:email', plannerController.deleteUser);
router.get('/verify-success',  plannerController.authentKey, plannerController.verifySuccess);

module.exports = router;