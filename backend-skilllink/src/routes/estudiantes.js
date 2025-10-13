import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todos los estudiantes
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM public.estudiante ORDER BY id_estudiante");
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener estudiantes:", error.message);
    res.status(500).json({ error: "Error al obtener estudiantes" });
  }
});

// GET - Estudiante por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM public.estudiante WHERE id_estudiante = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener estudiante:", error.message);
    res.status(500).json({ error: "Error al obtener estudiante" });
  }
});

// POST - Crear estudiante
router.post("/", async (req, res) => {
  try {
    const { nombre, paterno, materno, celular, email, carrera, univer_institu } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !paterno || !email) {
      return res.status(400).json({ error: "Nombre, apellido paterno y email son requeridos" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.estudiante (nombre, paterno, materno, celular, email, carrera, univer_institu) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, paterno, materno, celular, email, carrera, univer_institu]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear estudiante:", error.message);
    res.status(500).json({ error: "Error al crear estudiante" });
  }
});

// PUT - Actualizar estudiante
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, paterno, materno, celular, email, carrera, univer_institu } = req.body;
    
    // Validar que el estudiante existe
    const estudianteExistente = await pool.query(
      "SELECT * FROM public.estudiante WHERE id_estudiante = $1",
      [id]
    );
    
    if (estudianteExistente.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    
    const result = await pool.query(
      `UPDATE public.estudiante 
       SET nombre=$1, paterno=$2, materno=$3, celular=$4, email=$5, carrera=$6, univer_institu=$7 
       WHERE id_estudiante=$8 RETURNING *`,
      [nombre, paterno, materno, celular, email, carrera, univer_institu, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar estudiante:", error.message);
    res.status(500).json({ error: "Error al actualizar estudiante" });
  }
});

// PATCH - Actualizar parcialmente estudiante
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validar que el estudiante existe
    const estudianteExistente = await pool.query(
      "SELECT * FROM public.estudiante WHERE id_estudiante = $1",
      [id]
    );
    
    if (estudianteExistente.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }
    
    // Construir dinámicamente la consulta UPDATE
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    Object.keys(updates).forEach(key => {
      if (['nombre', 'paterno', 'materno', 'celular', 'email', 'carrera', 'univer_institu'].includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      return res.status(400).json({ error: "No hay campos válidos para actualizar" });
    }
    
    values.push(id);
    
    const query = `UPDATE public.estudiante SET ${fields.join(', ')} WHERE id_estudiante = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar estudiante:", error.message);
    res.status(500).json({ error: "Error al actualizar estudiante" });
  }
});

// DELETE - Eliminar estudiante
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el estudiante tiene inscripciones activas
    const inscripciones = await pool.query(
      "SELECT * FROM public.inscripcion WHERE id_estudiante = $1 AND estado_inscripcion = 'Activa'",
      [id]
    );
    
    if (inscripciones.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar el estudiante porque tiene inscripciones activas" 
      });
    }
    
    const result = await pool.query(
      "DELETE FROM public.estudiante WHERE id_estudiante = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    res.json({ 
      mensaje: "Estudiante eliminado correctamente",
      estudiante: result.rows[0]
    });
  } catch (error) {
    console.error("Error al eliminar estudiante:", error.message);
    res.status(500).json({ error: "Error al eliminar estudiante" });
  }
});

// GET - Buscar estudiantes por nombre o email
router.get("/buscar/:termino", async (req, res) => {
  try {
    const { termino } = req.params;
    const result = await pool.query(
      `SELECT * FROM public.estudiante 
       WHERE nombre ILIKE $1 OR paterno ILIKE $1 OR email ILIKE $1 
       ORDER BY nombre, paterno`,
      [`%${termino}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al buscar estudiantes:", error.message);
    res.status(500).json({ error: "Error al buscar estudiantes" });
  }
});

// GET - Estudiantes por universidad/institucion
router.get("/institucion/:institucion", async (req, res) => {
  try {
    const { institucion } = req.params;
    const result = await pool.query(
      "SELECT * FROM public.estudiante WHERE univer_institu ILIKE $1 ORDER BY nombre, paterno",
      [`%${institucion}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener estudiantes por institución:", error.message);
    res.status(500).json({ error: "Error al obtener estudiantes por institución" });
  }
});

// GET - Inscripciones del estudiante
router.get("/:id/inscripciones", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, t.nombre_tutoria, t.sigla 
       FROM public.inscripcion i
       JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria
       WHERE i.id_estudiante = $1
       ORDER BY i.fecha_inscripcion DESC`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener inscripciones del estudiante:", error.message);
    res.status(500).json({ error: "Error al obtener inscripciones del estudiante" });
  }
});

export default router;