"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUploadError = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
// Create uploads directory if it doesn't exist
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/payment-proofs';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5') * 1024 * 1024; // 5MB default
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg')
    .split(',')
    .map(type => type.trim());
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Create directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
        cb(null, UPLOAD_DIR);
    },
    filename: (_, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `proof-${uniqueSuffix}${path_1.default.extname(file.originalname).toLowerCase()}`);
    }
});
const fileFilter = (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type. Only ${ALLOWED_TYPES.join(', ')} are allowed.`));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1 // Only allow single file upload
    }
});
// Error handling middleware for file uploads
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        // A Multer error occurred when uploading
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message || 'Error uploading file'
        });
    }
    else if (err) {
        // An unknown error occurred
        return res.status(500).json({
            success: false,
            message: 'Internal server error during file upload'
        });
    }
    next();
};
exports.handleUploadError = handleUploadError;
exports.default = upload;
