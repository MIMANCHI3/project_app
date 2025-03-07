const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
// server.js
const db = new sqlite3.Database('data.db'); // 使用自定义文件名（非默认的db.sqlite）

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 创建表并初始化数据
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY,
      week INTEGER NOT NULL,
      day TEXT NOT NULL,
      status TEXT DEFAULT 'free'
    )
  `);

  // 预填充20周的数据（从第3周开始）
  const weeks = Array.from({ length: 20 }, (_, i) => i + 3);
  const days = ['一', '二', '三', '四', '五', '六', '日'];

  weeks.forEach((week) => {
    days.forEach((day) => {
      db.run(
        `INSERT OR IGNORE INTO schedule (week, day, status) VALUES (?, ?, ?)`,
        [week, day, 'free']
      );
    });
  });
});

// API：获取所有数据
app.get('/api/schedule', (req, res) => {
  db.all(
    `SELECT week, day, status FROM schedule ORDER BY week, day`,
    (err, rows) => {
      if (err) return res.status(500).send(err);
      res.json(rows);
    }
  );
});

// API：更新状态（管理员用）
app.post('/api/update', (req, res) => {
  const { week, day, status } = req.body;
  db.run(
    `UPDATE schedule SET status = ? WHERE week = ? AND day = ?`,
    [status, week, day],
    (err) => {
      if (err) return res.status(500).send(err);
      res.sendStatus(200);
    }
  );
});

// 启动服务
// server.js
const PORT = process.env.PORT || 3000; // 必须使用此格式
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
