require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/endfield_db')
    .then(() => console.log('✅ Kết nối MongoDB thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// User Model
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    tuvi: { type: String, default: 'Luyện Khí (Tầng 1)' },
    avatar: { type: String, default: '' },
    readChapters: { type: Number, default: 0 },
    readMinutes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- API Routes ---

// Register
app.post('/api/register', async (req, res) => {
    try {
        let { email, username, password } = req.body;
        email = email.toLowerCase();
        
        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) return res.status(400).json({ message: 'Email hoặc Tên đăng nhập đã tồn tại!' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            username,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server!', error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        let { email, password } = req.body; // 'email' here could be username or email
        const loginQuery = email.includes('@') ? { email: email.toLowerCase() } : { username: email };
        
        const user = await User.findOne(loginQuery);
        if (!user) return res.status(400).json({ message: 'Tài khoản hoặc Email không tồn tại!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu không chính xác!' });

        // Create Token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1d' });

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                tuvi: user.tuvi,
                avatar: user.avatar,
                readChapters: user.readChapters,
                readMinutes: user.readMinutes,
                comments: user.comments,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

// Update Profile
app.post('/api/update-profile', async (req, res) => {
    try {
        const { id, username, avatar } = req.body;
        const user = await User.findByIdAndUpdate(id, { username, avatar }, { new: true });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi cập nhật!' });
    }
});

// Serve Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
});
