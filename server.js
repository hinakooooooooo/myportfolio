require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const nodemailer = require('nodemailer');
const session = require('express-session');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'database.db'));
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

// --- DB bootstrap: ensure schema ---
const ensureSchema = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        tag TEXT,
        date TEXT,
        image_url TEXT,
        description TEXT,
        content TEXT,
        learning TEXT
      )
    `);

    // Add missing columns if DBが古い
    db.all("PRAGMA table_info(projects)", [], (err, rows) => {
      if (err) return console.error(err);
      const cols = rows.map(r => r.name);
      const want = ['tag','date','image_url','description','content','learning'];
      want.forEach(col => {
        if (!cols.includes(col)) {
          db.run(`ALTER TABLE projects ADD COLUMN ${col} TEXT`, () => {});
        }
      });
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        body TEXT,
        date TEXT,
        link TEXT
      )
    `);
  });
};
ensureSchema();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/login');
};

// --- Routes ---
app.get('/', (req, res) => {
  db.all('SELECT * FROM projects ORDER BY id ASC', [], (err, projects) => {
    if (err) return res.status(500).send('DB error');
    res.render('index', { projects, isAdmin: !!(req.session && req.session.isAdmin) });
  });
});

app.get('/projects/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).send('DB error');
    if (!row) return res.redirect('/');
    res.render('project_detail', { project: row });
  });
});

// --- Auth ---
app.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  return res.status(401).render('admin/login', { error: 'パスワードが違います' });
});
app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// --- Admin (簡易CMS) ---
app.get('/admin', requireAdmin, (req, res) => {
  db.all('SELECT * FROM projects ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).send('DB error');
    res.render('admin/dashboard', { projects: rows });
  });
});

app.post('/admin/projects/add', requireAdmin, (req, res) => {
  const { title, tag, date, image_url, description, content, learning } = req.body;
  const sql = `
    INSERT INTO projects (title, tag, date, image_url, description, content, learning)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    title || '',
    tag || '',
    date || '',
    image_url || '',
    description || '',
    content || '',
    learning || ''
  ];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).send('DB error: ' + err.message);
    return res.redirect('/admin');
  });
});

// API: add project (AJAX)
app.post('/api/projects', requireAdmin, (req, res) => {
  const { title, tag, date, image_url, description, content, learning } = req.body;
  const sql = `
    INSERT INTO projects (title, tag, date, image_url, description, content, learning)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    title || '',
    tag || '',
    date || '',
    image_url || '',
    description || '',
    content || '',
    learning || ''
  ];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ ok:false, error: err.message });
    return res.json({ ok:true, id:this.lastID });
  });
});

// API: delete project (AJAX)
app.delete('/api/projects/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM projects WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ ok:false, error: err.message });
    return res.json({ ok:true });
  });
});

app.post('/admin/projects/delete/:id', (req, res) => {
  db.run('DELETE FROM projects WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).send('DB error');
    return res.redirect('/admin');
  });
});

// --- News CMS ---
app.get('/admin/news', requireAdmin, (req, res) => {
  db.all('SELECT * FROM news ORDER BY date DESC, id DESC', [], (err, rows) => {
    if (err) return res.status(500).send('DB error');
    res.render('admin/news', { news: rows });
  });
});

app.post('/admin/news/add', requireAdmin, (req, res) => {
  const { title, body, date, link } = req.body;
  db.run(
    'INSERT INTO news (title, body, date, link) VALUES (?, ?, ?, ?)',
    [title || '', body || '', date || '', link || ''],
    (err) => {
      if (err) return res.status(500).send('DB error');
      return res.redirect('/admin/news');
    }
  );
});

app.post('/admin/news/delete/:id', requireAdmin, (req, res) => {
  db.run('DELETE FROM news WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).send('DB error');
    return res.redirect('/admin/news');
  });
});

// --- News public ---
app.get('/news', (req, res) => {
  db.all('SELECT * FROM news ORDER BY date DESC, id DESC', [], (err, rows) => {
    if (err) return res.status(500).send('DB error');
    res.render('news/index', { news: rows });
  });
});

app.get('/news/:id', (req, res) => {
  db.get('SELECT * FROM news WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).send('DB error');
    if (!row) return res.redirect('/news');
    res.render('news/detail', { item: row });
  });
});

// Purpose detail
app.get('/purpose', (req, res) => {
  res.render('purpose');
});

// --- Contact ---
const rateLimitMap = new Map();
app.post('/contact', async (req, res) => {
  const { name, email, message, website } = req.body;
  if (website) return res.status(400).json({ ok:false, error:'invalid' }); // honeypot
  if (!name || !email || !message) return res.status(400).json({ ok:false, error:'missing' });

  const now = Date.now();
  const key = req.ip;
  if (rateLimitMap.has(key) && now - rateLimitMap.get(key) < 10000) {
    return res.status(429).json({ ok:false, error:'too_many' });
  }
  rateLimitMap.set(key, now);

  try {
    if (process.env.NOTIFY_EMAIL && process.env.SMTP_URL) {
      const transport = nodemailer.createTransport(process.env.SMTP_URL);
      await transport.sendMail({
        from: process.env.NOTIFY_EMAIL,
        to: process.env.NOTIFY_EMAIL,
        subject: `[Portfolio] Contact from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`
      });
    } else {
      console.log('[Contact]', { name, email, message });
    }
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'mail_failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
