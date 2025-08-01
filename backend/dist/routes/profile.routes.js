"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const profile_controller_1 = require("../controllers/profile.controller");
const router = (0, express_1.Router)();
router.get('/me', auth_middleware_1.authenticate, profile_controller_1.getMe);
router.patch('/me', auth_middleware_1.authenticate, profile_controller_1.updateMe);
exports.default = router;
