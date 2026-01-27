const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');
db.serialize(() => {
  db.run("DROP TABLE IF EXISTS projects");
  db.run(`CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, tag TEXT, date TEXT, description TEXT, content TEXT, image_url TEXT, learning TEXT
  )`);
  const stmt = db.prepare("INSERT INTO projects (title, tag, description, content, learning) VALUES (?, ?, ?, ?, ?)");
  
  stmt.run("パフェに甘えて。", "Experience", "心の隙間を埋める体験設計", "「甘える」ことが苦手な自分への許しを、パフェという形に投影しました。", "誰かのために頑張りすぎる人が、一瞬だけ自分に戻れる時間の尊さを学びました。");
  
  stmt.run("自分を愛すアイス", "Product", "セルフラブを味覚で感じる", "溶けていくアイスと、ほぐれていく感情。自分を甘やかす許可証としてのプロダクト。", "「美味しい」という原始的な感覚が、どれほど心を救うかを実感しました。");
  
  stmt.run("大変よく頑張りましたカフェ", "Space", "全肯定される空間", "入り口で「頑張ったこと」を伝えると、それに見合った報酬が出るカフェ。", "承認欲求を「癒やし」に変換する空間デザインの可能性を追求しました。");
  
  stmt.run("絵本のおまじない", "Zine", "内省を物語にする", "読み終わる頃には、少しだけ自分のことが好きになっている、大人向けの絵本。", "言葉が持つ「ほぐす力」を、視覚表現と組み合わせて表現しました。");

  stmt.finalize();
});
db.close();
