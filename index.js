require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const db = new sqlite3.Database('database.db');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    db.all("SELECT * FROM projects", [], (err, rows) => {
        res.render('index', { projects: rows });
    });
});

app.get('/projects/:id', (req, res) => {
    db.get("SELECT * FROM projects WHERE id = ?", [req.params.id], (err, row) => {
        if (!row) return res.redirect('/');
        res.render('project_detail', { project: row });
    });
});

// Purpose detail
app.get('/purpose', (req, res) => {
    res.render('purpose');
});

app.listen(3000, () => console.log('Server: http://localhost:3000'));
