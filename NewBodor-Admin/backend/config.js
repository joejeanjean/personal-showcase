// ============================================================================
// NewBodor 企业管理后台 - 配置
// ============================================================================
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT || 9889);
const HOST = process.env.HOST || '127.0.0.1'; // 默认仅本机访问
const DATA_DIR = (process.env.NB_DATA_DIR || path.join(__dirname, '..', 'data')).replace(/\\/g, '/');
const DB_FILE = path.join(DATA_DIR, 'newbodor.db');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 小时
const JWT_SECRET = process.env.NB_SECRET || 'newbodor-admin-secret';

module.exports = { PORT, HOST, DATA_DIR, DB_FILE, FRONTEND_DIR, SESSION_TTL, JWT_SECRET };
