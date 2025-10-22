import pool from '../db.js';

const aprobacionController = {
    // Aprobar/rechazar inscripción de estudiante
    gestionarInscripcion: async (req, res) => {
        try {
            const { id } = req.params;
            const { estado, comentarios } = req.body;
            const idDocente = req.user.id_usuario;

            // Verificar que la inscripción existe
            const inscripcionResult = await pool.query(
                "SELECT * FROM public.inscripcion WHERE id_inscripcion = $1 AND activo = TRUE",
                [id]
            );
            
            if (inscripcionResult.rows.length === 0) {
                return res.status(404).json({ error: 'Inscripción no encontrada' });
            }

            const inscripcion = inscripcionResult.rows[0];

            // Verificar que el docente es tutor de esta tutoría
            const tutoriaResult = await pool.query(
                `SELECT t.* FROM public.tutoria t 
                 WHERE t.id_tutoria = $1 AND t.id_tutor = $2 AND t.activo = TRUE`,
                [inscripcion.id_tutoria, idDocente]
            );

            if (tutoriaResult.rows.length === 0) {
                return res.status(403).json({ error: 'No tienes permisos para gestionar esta inscripción' });
            }

            // Actualizar estado de la inscripción
            const updateResult = await pool.query(
                `UPDATE public.inscripcion 
                 SET estado_solicitud = $1, id_docente_aprobador = $2, fecha_aprobacion = $3
                 WHERE id_inscripcion = $4 RETURNING *`,
                [estado, idDocente, new Date(), id]
            );

            res.json({ 
                mensaje: `Inscripción ${estado} exitosamente`, 
                inscripcion: updateResult.rows[0] 
            });

        } catch (error) {
            console.error('Error en gestionarInscripcion:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener inscripciones pendientes del docente
    obtenerInscripcionesPendientes: async (req, res) => {
        try {
            const idDocente = req.user.id_usuario;

            const result = await pool.query(
                `SELECT i.*, 
                        e.nombre as estudiante_nombre, e.paterno as estudiante_paterno, 
                        e.materno as estudiante_materno, e.email as estudiante_email,
                        t.nombre_tutoria, t.sigla
                 FROM public.inscripcion i
                 JOIN public.estudiante e ON i.id_estudiante = e.id_estudiante AND e.activo = TRUE
                 JOIN public.tutoria t ON i.id_tutoria = t.id_tutoria AND t.activo = TRUE
                 WHERE t.id_tutor = $1 AND i.estado_solicitud = 'pendiente' AND i.activo = TRUE
                 ORDER BY i.fecha_solicitud DESC`,
                [idDocente]
            );

            res.json(result.rows);

        } catch (error) {
            console.error('Error en obtenerInscripcionesPendientes:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

export default aprobacionController;