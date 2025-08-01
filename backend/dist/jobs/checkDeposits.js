"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_controller_1 = require("../controllers/crypto.controller");
const node_cron_1 = __importDefault(require("node-cron"));
node_cron_1.default.schedule('*/30 * * * * *', crypto_controller_1.checkDeposits);
