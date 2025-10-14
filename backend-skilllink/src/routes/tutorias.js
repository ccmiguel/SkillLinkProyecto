import { Router } from "express";
import pool from "../db.js";

const router = Router();

// ✅ GET - Obtener todas las tutorías (ACTUALIZADO con eliminación lógica)
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Ejecutando consulta para obtener todas las tutorías activas...");
    const result = await pool.query(`
      SELECT t.*, tu.nombre as tutor_nombre, i.nombre as institucion_nombre
      FROM tutoria t
      JOIN tutor tu ON t.id_tutor = tu.id_tutor AND tu.activo = TRUE
      JOIN institucion i ON t.id_institucion = i.id_institucion AND i.activo = TRUE
      WHERE t.activo = TRUE
    `);
    console.log(`✅ Se encontraron ${result.rows.length} tutorías activas`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener tutorías:", error.message);
    res.status(500).json({ 
      error: "Error al obtener tutorías",
      detalle: error.message 
    });
  }
});

// ✅ GET - Obtener una tutoria por ID (ACTUALIZADO con eliminación lógica)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, tu.nombre as tutor_nombre, i.nombre as institucion_nombre
       FROM tutoria t
       JOIN tutor tu ON t.id_tutor = tu.id_tutor AND tu.activo = TRUE
       JOIN institucion i ON t.id_institucion = i.id_institucion AND i.activo = TRUE
       WHERE t.id_tutoria = $1 AND t.activo = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutoría no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener tutoría:", error.message);
    res.status(500).json({ 
      error: "Error al obtener tutoría",
      detalle: error.message 
    });
  }
});

// ✅ POST - Crear una nueva tutoria (ACTUALIZADO con eliminación lógica)
router.post("/", async (req, res) => {
  try {
    const { sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion } = req.body;
    
    // Validar que el tutor existe y está activo
    const tutor = await pool.query(
      "SELECT * FROM tutor WHERE id_tutor = $1 AND activo = TRUE",
      [id_tutor]
    );
    
    if (tutor.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado o deshabilitado" });
    }
    
    // Validar que la institución existe y está activa
    const institucion = await pool.query(
      "SELECT * FROM institucion WHERE id_institucion = $1 AND activo = TRUE",
      [id_institucion]
    );
    
    if (institucion.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada o deshabilitada" });
    }
    
    const result = await pool.query(
      `INSERT INTO tutoria (sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion, activo) 
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING *`,
      [sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al crear tutoría:", error.message);
    res.status(500).json({ 
      error: "Error al crear tutoría",
      detalle: error.message 
    });
  }
});

// ✅ PUT - Actualizar una tutoria (ACTUALIZADO con eliminación lógica)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion } = req.body;

    // Validar que el tutor existe y está activo (si se está actualizando)
    if (id_tutor) {
      const tutor = await pool.query(
        "SELECT * FROM tutor WHERE id_tutor = $1 AND activo = TRUE",
        [id_tutor]
      );
      
      if (tutor.rows.length === 0) {
        return res.status(404).json({ error: "Tutor no encontrado o deshabilitado" });
      }
    }
    
    // Validar que la institución existe y está activa (si se está actualizando)
    if (id_institucion) {
      const institucion = await pool.query(
        "SELECT * FROM institucion WHERE id_institucion = $1 AND activo = TRUE",
        [id_institucion]
      );
      
      if (institucion.rows.length === 0) {
        return res.status(404).json({ error: "Institución no encontrada o deshabilitada" });
      }
    }

    const result = await pool.query(
      `UPDATE tutoria 
       SET sigla=$1, nombre_tutoria=$2, cupo=$3, descripcion_tutoria=$4, id_tutor=$5, id_institucion=$6 
       WHERE id_tutoria=$7 AND activo = TRUE RETURNING *`,
      [sigla, nombre_tutoria, cupo, descripcion_tutoria, id_tutor, id_institucion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutoría no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al actualizar tutoría:", error.message);
    res.status(500).json({ 
      error: "Error al actualizar tutoría",
      detalle: error.message 
    });
  }
});

// ✅ DELETE - Eliminación lógica (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay inscripciones activas para esta tutoría
    const inscripciones = await pool.query(
      "SELECT * FROM inscripcion WHERE id_tutoria = $1 AND activo = TRUE",
      [id]
    );
    
    if (inscripciones.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la tutoría porque tiene inscripciones activas" 
      });
    }
    
    // Verificar si hay actividades activas para esta tutoría
    const actividades = await pool.query(
      "SELECT * FROM actividad WHERE id_tutoria = $1 AND activo = TRUE",
      [id]
    );
    
    if (actividades.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la tutoría porque tiene actividades activas" 
      });
    }
    
    // Verificar si hay preguntas activas para esta tutoría
    const preguntas = await pool.query(
      "SELECT * FROM preguntas WHERE id_tutoria = $1 AND activo = TRUE",
      [id]
    );
    
    if (preguntas.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la tutoría porque tiene preguntas activas" 
      });
    }
    
    // Verificar si hay asignaciones activas para esta tutoría
    const asignaciones = await pool.query(
      "SELECT * FROM asigna WHERE id_tutoria = $1 AND activo = TRUE",
      [id]
    );
    
    if (asignaciones.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede deshabilitar la tutoría porque tiene asignaciones activas" 
      });
    }
    
    // En lugar de DELETE, hacemos un UPDATE para marcar como inactivo
    const result = await pool.query(
      `UPDATE tutoria SET activo = FALSE 
       WHERE id_tutoria = $1 AND activo = TRUE 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Tutoría no encontrada o ya está deshabilitada" });
    }

    res.json({ 
      mensaje: "Tutoría deshabilitada correctamente",
      tutoria: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error al deshabilitar tutoría:", error.message);
    res.status(500).json({ 
      error: "Error al deshabilitar tutoría",
      detalle: error.message 
    });
  }
});

// ✅ OPCIONAL: Endpoint para reactivar una tutoría
router.patch("/:id/activar", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el tutor asociado sigue activo
    const tutoria = await pool.query(
      `SELECT t.*, tu.activo as tutor_activo, i.activo as institucion_activa
       FROM tutoria t
       JOIN tutor tu ON t.id_tutor = tu.id_tutor
       JOIN institucion i ON t.id_institucion = i.id_institucion
       WHERE t.id_tutoria = $1`,
      [id]
    );
    
    if (tutoria.rows.length === 0) {
      return res.status(404).json({ error: "Tutoría no encontrada" });
    }
    
    if (!tutoria.rows[0].tutor_activo) {
      return res.status(400).json({ error: "No se puede reactivar: el tutor asociado está deshabilitado" });
    }
    
    if (!tutoria.rows[0].institucion_activa) {
      return res.status(400).json({ error: "No se puede reactivar: la institución asociada está deshabilitada" });
    }
    
    const result = await pool.query(
      "UPDATE tutoria SET activo = TRUE WHERE id_tutoria = $1 RETURNING *",
      [id]
    );

    res.json({ 
      mensaje: "Tutoría reactivada correctamente",
      tutoria: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Error al reactivar tutoría:", error.message);
    res.status(500).json({ 
      error: "Error al reactivar tutoría",
      detalle: error.message 
    });
  }
});

// ✅ GET - Tutorías por tutor (ACTUALIZADO con eliminación lógica)
router.get("/tutor/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el tutor existe y está activo
    const tutor = await pool.query(
      "SELECT * FROM tutor WHERE id_tutor = $1 AND activo = TRUE",
      [id]
    );
    
    if (tutor.rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }
    
    const result = await pool.query(
      `SELECT t.*, i.nombre as institucion_nombre
       FROM tutoria t
       JOIN institucion i ON t.id_institucion = i.id_institucion AND i.activo = TRUE
       WHERE t.id_tutor = $1 AND t.activo = TRUE
       ORDER BY t.nombre_tutoria`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener tutorías por tutor:", error.message);
    res.status(500).json({ 
      error: "Error al obtener tutorías por tutor",
      detalle: error.message 
    });
  }
});

// ✅ GET - Tutorías por institución (ACTUALIZADO con eliminación lógica)
router.get("/institucion/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la institución existe y está activa
    const institucion = await pool.query(
      "SELECT * FROM institucion WHERE id_institucion = $1 AND activo = TRUE",
      [id]
    );
    
    if (institucion.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }
    
    const result = await pool.query(
      `SELECT t.*, tu.nombre as tutor_nombre
       FROM tutoria t
       JOIN tutor tu ON t.id_tutor = tu.id_tutor AND tu.activo = TRUE
       WHERE t.id_institucion = $1 AND t.activo = TRUE
       ORDER BY t.nombre_tutoria`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener tutorías por institución:", error.message);
    res.status(500).json({ 
      error: "Error al obtener tutorías por institución",
      detalle: error.message 
    });
  }
});

// ✅ GET - Estadísticas de tutorías (ACTUALIZADO con eliminación lógica)
router.get("/estadisticas/resumen", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_tutorias,
        SUM(cupo) as total_cupos,
        AVG(cupo) as promedio_cupos,
        COUNT(DISTINCT id_tutor) as tutores_activos,
        COUNT(DISTINCT id_institucion) as instituciones_activas
      FROM tutoria
      WHERE activo = TRUE
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error al obtener estadísticas de tutorías:", error.message);
    res.status(500).json({ 
      error: "Error al obtener estadísticas de tutorías",
      detalle: error.message 
    });
  }
});

export default router;