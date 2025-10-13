import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// 🔍 DEBUG: Ver qué variables se están cargando
console.log("🔍 Variables de entorno cargadas:");
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_PASS:", process.env.DB_PASS ? "***" : "No definida");

// ✅ CORRECTO: Usar destructuring después de importar pg
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: "skill_link_db",  // ← Forzar el nombre aquí
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// Función mejorada para verificar conexión y tablas
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Conexión a PostgreSQL establecida correctamente");
    
    // Verificar en qué base de datos estamos conectados
    const dbInfo = await client.query("SELECT current_database()");
    console.log(`📊 Conectado a la base de datos: ${dbInfo.rows[0].current_database}`);
    
    // Verificar si la tabla TUTORIA existe
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'tutoria'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log("❌ La tabla TUTORIA NO existe en esta base de datos");
      
      // Listar todas las tablas disponibles para diagnóstico
      const allTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      console.log("📋 Tablas disponibles en esta BD:");
      allTables.rows.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log("✅ La tabla TUTORIA existe");
      
      // Contar registros en TUTORIA
      const countResult = await client.query("SELECT COUNT(*) FROM tutoria");
      console.log(`📊 Total de tutorías en la base de datos: ${countResult.rows[0].count}`);
    }
    
    client.release();
  } catch (err) {
    console.error("❌ Error al conectar a PostgreSQL:", err.message);
  }
})();

export default pool;