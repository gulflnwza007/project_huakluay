const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // ให้ Backend อ่าน JSON จากหน้าเว็บได้

// ตั้งค่าการเชื่อมต่อ (ใช้ข้อมูลจาก docker-compose ของนาย)
const db = mysql.createConnection({
  host: 'localhost',    // ถ้าเทสผ่านเครื่องตัวเองใช้ localhost (Port 3307)
  port: 3307,           
  user: 'senior_user',
  password: 'password123',
  database: 'health_tracker'
});

db.connect((err) => {
  if (err) {
    console.error('เชื่อมต่อ DB ไม่สำเร็จ!: ' + err.message);
    return;
  }
  console.log('--- Database Connected! พร้อมปั่นโปรเจคแล้วเพื่อน ---');
});

app.post('/api/register',(req,res)=>{
    const {username, password,height,target_weight} = req.body;

    const sql = "INSERT INTO users (username, password, height, target_weight) VALUES (?,?,?,?)";

    db.query(sql,[username,password,height,target_weight],(err,result)=>{
        if(err){
            console.error(err);
            return res.status(500).json({message:"เกิดข้อผิดพลาดในการสมัครสมาชิก", error:err});
        }
        res.status(201).json({ message: "สมัครสมาชิกสำเร็จ!",userId: result.insertId});
    })
})
// API สำหรับ Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // ค้นหา User จาก username
    const sql = "SELECT * FROM users WHERE username = ?";
    
    db.query(sql, [username], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err });
        }

        // ถ้าเจอ User
        if (results.length > 0) {
            const user = results[0];
            
            // เช็ครหัสผ่าน (ในโปรเจคจริงควรใช้ bcrypt เทียบ password ที่ hash ไว้)
            if (user.password === password) {
                res.status(200).json({ 
                    message: "Login สำเร็จ!", 
                    user: {
                        id: user.id,
                        username: user.username,
                        height: user.height,
                        target_weight: user.target_weight
                    }
                });
            } else {
                res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
            }
        } else {
            res.status(404).json({ message: "ไม่พบชื่อผู้ใช้งานนี้" });
        }
    });
});
// API สำหรับบันทึกข้อมูลสุขภาพรายวัน
app.post('/api/logs', (req, res) => {
    const { user_id, log_date, weight, calories_in, calories_out } = req.body;

    const sql = `INSERT INTO daily_logs (user_id, log_date, weight, calories_in, calories_out) 
                 VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [user_id, log_date, weight, calories_in, calories_out], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "บันทึกข้อมูลไม่สำเร็จ", error: err });
        }
        res.status(201).json({ message: "บันทึกข้อมูลเรียบร้อยแล้ว!", logId: result.insertId });
    });
});
// API สำหรับดึงข้อมูลสุขภาพทั้งหมดของ User คนนั้นๆ
app.get('/api/logs/:user_id', (req, res) => {
    const { user_id } = req.params;

    const sql = "SELECT * FROM daily_logs WHERE user_id = ? ORDER BY log_date DESC";

    db.query(sql, [user_id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "ดึงข้อมูลผิดพลาด", error: err });
        }
        res.status(200).json(results);
    });
});

// API สำหรับดึงข้อมูลโปรไฟล์ (รวมน้ำหนักเป้าหมาย)
app.get('/api/user/:id', (req, res) => {
    const { id } = req.params;
    const sql = "SELECT username, height, target_weight FROM users WHERE id = ?";
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length > 0) res.json(results[0]);
        else res.status(404).json({ message: "ไม่พบผู้ใช้" });
    });
});

app.listen(5000, () => {
  console.log('Backend Server is running on port 5000');
});

