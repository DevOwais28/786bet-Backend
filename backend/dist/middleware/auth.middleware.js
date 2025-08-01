"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
// src/middleware/auth.middleware.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ message: 'No token' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
// ---- add this ----
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ message: 'Unauthorized' });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ message: 'Forbidden' });
        next();
    };
};
exports.authorize = authorize;
