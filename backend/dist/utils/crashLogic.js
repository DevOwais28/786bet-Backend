"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCrashHistory = exports.randomCrash = void 0;
const randomCrash = () => {
    return Math.round((Math.random() * 10 + 1) * 100) / 100;
};
exports.randomCrash = randomCrash;
const generateCrashHistory = (count = 10) => {
    return Array.from({ length: count }, () => (0, exports.randomCrash)());
};
exports.generateCrashHistory = generateCrashHistory;
