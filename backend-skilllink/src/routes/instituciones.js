import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET - Todas las instituciones
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM public.institucion ORDER BY id_institucion");
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener instituciones:", error.message);
    res.status(500).json({ error: "Error al obtener instituciones" });
  }
});

// GET - Institución por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM public.institucion WHERE id_institucion = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener institución:", error.message);
    res.status(500).json({ error: "Error al obtener institución" });
  }
});

// POST - Crear institución
router.post("/", async (req, res) => {
  try {
    const { nombre, direccion, telefono, tipo_institucion, horario_atencion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: "El nombre de la institución es requerido" });
    }
    
    const result = await pool.query(
      `INSERT INTO public.institucion (nombre, direccion, telefono, tipo_institucion, horario_atencion) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre, direccion, telefono, tipo_institucion, horario_atencion]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear institución:", error.message);
    res.status(500).json({ error: "Error al crear institución" });
  }
});

// PUT - Actualizar institución
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono, tipo_institucion, horario_atencion } = req.body;
    
    const result = await pool.query(
      `UPDATE public.institucion 
       SET nombre=$1, direccion=$2, telefono=$3, tipo_institucion=$4, horario_atencion=$5 
       WHERE id_institucion=$6 RETURNING *`,
      [nombre, direccion, telefono, tipo_institucion, horario_atencion, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al actualizar institución:", error.message);
    res.status(500).json({ error: "Error al actualizar institución" });
  }
});

// DELETE - Eliminar institución
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay aulas asociadas a esta institución
    const aulas = await pool.query(
      "SELECT * FROM public.aula WHERE id_institucion = $1",
      [id]
    );
    
    if (aulas.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar la institución porque tiene aulas asociadas" 
      });
    }
    
    // Verificar si hay tutorías asociadas a esta institución
    const tutorias = await pool.query(
      "SELECT * FROM public.tutoria WHERE id_institucion = $1",
      [id]
    );
    
    if (tutorias.rows.length > 0) {
      return res.status(400).json({ 
        error: "No se puede eliminar la institución porque tiene tutorías asociadas" 
      });
    }
    
    const result = await pool.query(
      "DELETE FROM public.institucion WHERE id_institucion = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Institución no encontrada" });
    }

    res.json({ 
      mensaje: "Institución eliminada correctamente",
      institucion: result.rows[0]
    });
  } catch (error) {
    console.error("Error al eliminar institución:", error.message);
    res.status(500).json({ error: "Error al eliminar institución" });
  }
});

// GET - Aulas de la institución
router.get("/:id/aulas", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM public.aula WHERE id_institucion = $1 ORDER BY id_aula",
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener aulas de la institución:", error.message);
    res.status(500).json({ error: "Error al obtener aulas de la institución" });
  }
});

// GET - Tutorías de la institución
router.get("/:id/tutorias", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT t.*, tu.nombre as tutor_nombre 
       FROM public.tutoria t
       JOIN public.tutor tu ON t.id_tutor = tu.id_tutor
       WHERE t.id_institucion = $1
       ORDER BY t.id_tutoria`,
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener tutorías de la institución:", error.message);
    res.status(500).json({ error: "Error al obtener tutorías de la institución" });
  }
});

export default router;