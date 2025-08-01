"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const withdrawal_controller_1 = require("../controllers/withdrawal.controller");
const upload_1 = __importDefault(require("../middleware/upload"));
const router = (0, express_1.Router)();
router.post('/user/withdraw', withdrawal_controller_1.createWithdrawal);
router.post('/upload-withdrawal-screenshot', upload_1.default.single('screenshot'), withdrawal_controller_1.uploadWithdrawalProof);
exports.default = router;
