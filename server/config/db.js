const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,                       // Supabase free tier = 60 total connections
  idleTimeoutMillis: 30000,      // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail fast if can't connect within 5s
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Database connected ✓");
    release();
  }
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_color VARCHAR(20) DEFAULT '#3b82f6',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(12) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      host_id UUID REFERENCES users(id) ON DELETE CASCADE,
      password_hash VARCHAR(255),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS room_files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
      uploaded_by UUID REFERENCES users(id),
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100),
      size_bytes INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("Database tables initialized ✓");
};

module.exports = { pool, initDB };