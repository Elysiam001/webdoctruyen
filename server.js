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
    exp: { type: Number, default: 0 },
    avatar: { type: String, default: '' },
    readChapters: { type: Number, default: 0 },
    readMinutes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Novel Model
const novelSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    cover: { type: String, default: 'cover1.png' },
    chapters: { type: Number, default: 0 },
    status: { type: String, default: 'Đang ra' },
    uploaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const Novel = mongoose.model('Novel', novelSchema);

// Chapter Model
const chapterSchema = new mongoose.Schema({
    novelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Novel', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    chapterNumber: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Chapter = mongoose.model('Chapter', chapterSchema);

// Cultivation Ranks Helper
const getRankInfo = (exp) => {
    const ranks = [
        "Luyện Khí", "Trúc Cơ", "Kim Đan", "Nguyên Anh", "Hóa Thần", 
        "Luyện Hư", "Hợp Thể", "Đại Thừa", "Độ Kiếp"
    ];
    
    // Each rank has 9 layers (Tầng)
    // EXP per layer increases: Rank 0 = 100/layer, Rank 1 = 500/layer, Rank 2 = 2000/layer...
    const getLayerExp = (rankIdx) => 100 * Math.pow(5, rankIdx);
    
    let currentExp = exp;
    for (let i = 0; i < ranks.length; i++) {
        const layerExp = getLayerExp(i);
        const rankTotalExp = layerExp * 9;
        
        if (currentExp < rankTotalExp) {
            const layer = Math.floor(currentExp / layerExp) + 1;
            const progress = ((currentExp % layerExp) / layerExp) * 100;
            return {
                title: `${ranks[i]} (Tầng ${layer})`,
                progress: progress.toFixed(1),
                nextExp: layerExp - (currentExp % layerExp)
            };
        }
        currentExp -= rankTotalExp;
    }
    return { title: "Chí Tôn (Cực Hạn)", progress: 100, nextExp: 0 };
};

// --- API Routes ---

// Register
app.post('/api/register', async (req, res) => {
    try {
        let { email, username, password } = req.body;
        email = email.toLowerCase();
        
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) return res.status(400).json({ message: 'Email hoặc Tên đăng nhập đã tồn tại!' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            username,
            password: hashedPassword,
            exp: 0 // Start from zero
        });

        await newUser.save();
        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server!' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        const loginQuery = email.includes('@') ? { email: email.toLowerCase() } : { username: email };
        
        const user = await User.findOne(loginQuery);
        if (!user) return res.status(400).json({ message: 'Tài khoản không tồn tại!' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Mật khẩu không chính xác!' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        const rank = getRankInfo(user.exp);

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                tuvi: rank.title,
                tuviProgress: rank.progress,
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

// Heartbeat - Update EXP & Minutes
app.post('/api/heartbeat', async (req, res) => {
    try {
        const { id } = req.body;
        // Add 10 exp and 1 minute
        const user = await User.findByIdAndUpdate(
            id, 
            { $inc: { exp: 10, readMinutes: 1 } }, 
            { new: true }
        );
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const rank = getRankInfo(user.exp);
        res.json({
            readMinutes: user.readMinutes,
            tuvi: rank.title,
            tuviProgress: rank.progress
        });
    } catch (err) {
        res.status(500).json({ message: 'Error' });
    }
});

// --- Novel Routes ---

// Post Novel
app.post('/api/novels', async (req, res) => {
    try {
        const { title, author, category, description, cover, chapters, status, uploaderId } = req.body;
        const newNovel = new Novel({
            title, author, category, description, cover, chapters, status, uploaderId
        });
        await newNovel.save();
        res.status(201).json({ message: 'Đăng truyện thành công!', novel: newNovel });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi đăng truyện!' });
    }
});

// Get All Novels
app.get('/api/novels', async (req, res) => {
    try {
        const novels = await Novel.find().sort({ createdAt: -1 });
        res.json(novels);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách truyện!' });
    }
});

// Get My Novels
app.get('/api/my-novels/:userId', async (req, res) => {
    try {
        const novels = await Novel.find({ uploaderId: req.params.userId }).sort({ createdAt: -1 });
        res.json(novels);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách truyện của bạn!' });
    }
});

// --- Chapter Routes ---

// Post Chapter
app.post('/api/chapters', async (req, res) => {
    try {
        const { novelId, title, content, chapterNumber, userId } = req.body;
        
        // Security Check: Verify uploader
        const novel = await Novel.findById(novelId);
        if (!novel) return res.status(404).json({ message: 'Không tìm thấy truyện!' });
        
        if (novel.uploaderId !== userId) {
            return res.status(403).json({ message: 'Bạn không có quyền đăng chương cho truyện này!' });
        }

        const newChapter = new Chapter({ novelId, title, content, chapterNumber });
        await newChapter.save();

        // Update chapter count in Novel
        await Novel.findByIdAndUpdate(novelId, { $inc: { chapters: 1 } });

        res.status(201).json({ message: 'Đăng chương thành công!', chapter: newChapter });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi đăng chương!' });
    }
});

// Get Chapters for a Novel
app.get('/api/novels/:id/chapters', async (req, res) => {
    try {
        const chapters = await Chapter.find({ novelId: req.params.id }).sort({ chapterNumber: 1 });
        res.json(chapters);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách chương!' });
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
