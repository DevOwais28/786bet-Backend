"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const payments_routes_1 = __importDefault(require("./routes/payments.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const game_routes_1 = __importDefault(require("./routes/game.routes"));
const bets_routes_1 = __importDefault(require("./routes/bets.routes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cookie_parser_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.get("/", (req, res) => {
  res.send("Backend working ✅");
});

app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Static files
app.use('/uploads', express_1.default.static('uploads'));
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/user', user_routes_1.default);
app.use('/api/payments', payments_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/game', game_routes_1.default);
app.use('/api/bets', bets_routes_1.default);
// MongoDB connection
mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aviator-betting')
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`🚀 Aviator Betting Platform running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
