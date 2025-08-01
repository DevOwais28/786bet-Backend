"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
const crypto_js_1 = __importDefault(require("crypto-js"));
const key = process.env.ENCRYPTION_KEY; // 32-char string
const encrypt = (plain) => crypto_js_1.default.AES.encrypt(plain, key).toString();
exports.encrypt = encrypt;
const decrypt = (cipher) => crypto_js_1.default.AES.decrypt(cipher, key).toString(crypto_js_1.default.enc.Utf8);
exports.decrypt = decrypt;
