// 迁移脚本：将管理员姓名 "许振" 改为 "周镇镇"
// 用法: node test/migrate_admin_name.js [db1 db2 ...]
// 默认处理 data/newbodor.db 与 data-demo/newbodor.db
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const targets = process.argv.slice(2);
const DB_FILES = targets.length
  ? targets.map(t => path.isAbsolute(t) ? t : path.join(ROOT, t))
  : [path.join(ROOT, 'data', 'newbodor.db'), path.join(ROOT, 'data-demo', 'newbodor.db')];

const STATEMENTS = [
  "UPDATE enterprise SET admin_name = '周镇镇' WHERE admin_name = '许振'",
  "UPDATE departments SET manager = '周镇镇' WHERE manager = '许振'",
  "UPDATE members SET name = '周镇镇' WHERE name = '许振'",
  "UPDATE circle_posts SET author = '周镇镇' WHERE author = '许振'",
  "UPDATE audit_logs SET user_name = '周镇镇' WHERE user_name = '许振'",
];

for (const dbFile of DB_FILES) {
  const abs = path.resolve(dbFile);
  let db;
  try {
    db = new DatabaseSync(abs);
  } catch (e) {
    console.error(`[跳过] 无法打开 ${abs}: ${e.message}`);
    continue;
  }
  try {
    let total = 0;
    for (const sql of STATEMENTS) {
      try {
        const res = db.prepare(sql).run();
        if (res.changes > 0) {
          total += res.changes;
        }
      } catch (e) {
        // 表不存在或列不存在时跳过（不同库版本可能缺表）
        if (!/no such table|no such column/i.test(e.message)) throw e;
      }
    }
    console.log(`[完成] ${abs}  共更新 ${total} 行`);
  } finally {
    db.close();
  }
}
