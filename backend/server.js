const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../Frontend')));

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
    else console.log('System Connected: Database Ready');
});

// --- 2. API Routes ---
// สมัครสมาชิก (Register)
app.post('/api/register', (req, res) => {
    const { username, password, gender, age, height, target_weight } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: "กรุณากรอกชื่อและรหัสผ่าน" });
    }

    // 🚨 แก้ตรงนี้! เปลี่ยนให้ตรงกับฐานข้อมูลเป๊ะๆ (target_weigth) 🚨
    const sql = "INSERT INTO users (username, password, gender, age, height, target_weight) VALUES (?,?,?,?,?,?)";
    
    // ใส่ค่าสำรอง (Default) กันเหนียวไว้ทุกช่อง
    const values = [
        username, 
        password, 
        gender || 'ชาย', 
        parseInt(age) || 0, 
        parseFloat(height) || 0, 
        parseFloat(target_weight) || 0  // ตัวแปรยังชื่อเดิม แต่จะถูกส่งไปลงคอลัมน์ใหม่
    ];

    db.query(sql, values, (err) => {
        if (err) {
            console.error("❌ Error:", err.message);
            // ดัก Error กรณีชื่อซ้ำ จะได้แจ้งผู้ใช้ชัดเจน
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเปลี่ยนชื่อใหม่" });
            }
            return res.status(500).json({ message: "สมัครไม่สำเร็จ: " + err.message });
        }
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
// --- API สำหรับตาราง exercises ---

// 1. บันทึกกิจกรรมการออกกำลังกายรายครั้ง
app.post('/api/exercises', (req, res) => {
    const { user_id, exercise_type, duration_minutes, calories_burned, exercise_date } = req.body;
    
    // ถ้า DB ของคุณใช้ชื่อ table เดิมที่ typo คือ exercirses ให้แก้ตรงนี้
    const exerciseTable = 'exercirses'; // หรือ 'exercises' ถ้าคุณแก้ชื่อ table แล้ว
    const sql = `INSERT INTO ${exerciseTable} (user_id, exercise_type, duration_minutes, calories_burned, exercise_date) VALUES (?,?,?,?,?)`;
    
    db.query(sql, [user_id, exercise_type, duration_minutes, calories_burned, exercise_date], (err, result) => {
        if (err) {
            console.error("❌ Insert Exercise Error:", err);
            return res.status(500).json({ error: "บันทึกกิจกรรมไม่สำเร็จ" });
        }
        res.status(201).json({ message: "บันทึกกิจกรรมเรียบร้อยแล้ว", id: result.insertId });
    });
});

// 2. ดึงประวัติการออกกำลังกายทั้งหมดของ user คนนั้น
app.get('/api/exercises/:user_id', (req, res) => {
    const userId = req.params.user_id;
    const exerciseTable = 'exercirses'; // ปรับตาม schema จริงของคุณ
    const sql = `SELECT * FROM ${exerciseTable} WHERE user_id = ? ORDER BY exercise_date DESC`;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("❌ Fetch Exercise Error:", err);
            return res.status(500).json({ error: "ดึงข้อมูลไม่สำเร็จ" });
        }
        res.json(results);
    });
});

// 3. สรุปสถิติ (weekly burn, top activity, 7-day trend)
app.get('/api/stats/:user_id', (req, res) => {
    const userId = req.params.user_id;
    const exerciseTable = 'exercirses'; // ปรับตาม schema จริงของคุณ

    const summarySql = `
        SELECT
            COALESCE(SUM(calories_burned), 0) AS weekly_burn,
            (SELECT exercise_type
             FROM ${exerciseTable}
             WHERE user_id = ? AND exercise_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
             GROUP BY exercise_type
             ORDER BY SUM(calories_burned) DESC
             LIMIT 1) AS top_activity
        FROM ${exerciseTable}
        WHERE user_id = ? AND exercise_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `;

    const trendSql = `
        SELECT
            DATE(exercise_date) AS day,
            COALESCE(SUM(calories_burned), 0) AS burned
        FROM ${exerciseTable}
        WHERE user_id = ? AND exercise_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(exercise_date)
        ORDER BY DATE(exercise_date)
    `;

    db.query(summarySql, [userId, userId], (err, summaryResults) => {
        if (err) {
            console.error('❌ Stats summary error:', err);
            return res.status(500).json({ error: 'ไม่สามารถดึงสถิติได้' });
        }

        db.query(trendSql, [userId], (err2, trendResults) => {
            if (err2) {
                console.error('❌ Stats trend error:', err2);
                return res.status(500).json({ error: 'ไม่สามารถดึงแนวโน้มได้' });
            }

            const startDate = new Date();
            startDate.setHours(0,0,0,0);
            startDate.setDate(startDate.getDate() - 6);

            const trendMap = trendResults.reduce((acc, row) => {
                const key = new Date(row.day).toISOString().split('T')[0];
                acc[key] = Number(row.burned);
                return acc;
            }, {});

            const trend = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const dayKey = d.toISOString().split('T')[0];
                trend.push({ day: dayKey, burned: trendMap[dayKey] || 0 });
            }

            const summary = summaryResults[0] || { weekly_burn: 0, top_activity: null };
            res.json({
                weekly_burn: Number(summary.weekly_burn),
                top_activity: summary.top_activity || 'ไม่มีข้อมูล',
                trend
            });
        });
    });
});

require('dotenv').config();

app.listen(5000, () => console.log('🚀 Server running on http://localhost:5000'));