const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. เชื่อมต่อ Database (Port 3307 ตามที่นายใช้) ---
const db = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'senior_user',
  password: 'password123',
  database: 'health_tracker'
});

db.connect(err => {
    if (err) console.error('❌ DB Error:', err);
    else console.log('✅ H4U System Connected: Database Ready');
});

// --- 2. API Routes ---

// สมัครสมาชิก (Register)
app.post('/api/register', (req, res) => {
    const { username, password, gender, age, height, target_weight } = req.body;
    const sql = "INSERT INTO users (username, password, gender, age, height, target_weight) VALUES (?,?,?,?,?,?)";
    db.query(sql, [username, password, gender, age, height, target_weight], (err) => {
        if (err) return res.status(500).json({ message: "ชื่อผู้ใช้ซ้ำหรือข้อมูลผิดพลาด" });
        res.status(201).json({ message: "สมัครสมาชิกสำเร็จ" });
    });
});

// เข้าสู่ระบบ (Login)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT id, username FROM users WHERE username = ? AND password = ?", [username, password], (err, results) => {
        if (results.length > 0) res.json({ success: true, user: results[0] });
        else res.status(401).json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านผิด" });
    });
});

// บันทึกข้อมูลสุขภาพ
app.post('/api/logs', (req, res) => {
    const { user_id, log_date, weight, calories_in, calories_out, water_glass } = req.body;
    const sql = "INSERT INTO daily_logs (user_id, log_date, weight, calories_in, calories_out, water_glass) VALUES (?,?,?,?,?,?)";
    db.query(sql, [user_id, log_date, weight, calories_in || 0, calories_out || 0, water_glass || 0], (err) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: "บันทึกไม่สำเร็จ" });
        } else {
            res.status(201).json({ message: "Success" });
        }
    });
});

// ดึงข้อมูลส่วนตัว (BMI/BMR)
app.get('/api/user/:id', (req, res) => {
    db.query("SELECT * FROM users WHERE id = ?", [req.params.id], (err, results) => {
        if (results.length > 0) res.json(results[0]);
        else res.status(404).send("Not found");
    });
});

// ดึงประวัติ 7 วัน (Chart)
app.get('/api/logs/:user_id', (req, res) => {
    db.query("SELECT * FROM daily_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 7", [req.params.user_id], (err, results) => {
        res.json(results);
    });
});

app.listen(5000, () => console.log('🚀 Server running on http://localhost:5000'));