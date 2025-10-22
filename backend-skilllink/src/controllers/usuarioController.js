import pool from '../db.js';
import bcrypt from 'bcryptjs';

const usuarioController = {
    // Crear usuario (queda pendiente de aprobación)
    crearUsuario: async (req, res) => {
        try {
            const { username, password, email, id_rol } = req.body;
            
            // Verificar si usuario ya existe
            const usuarioExistente = await pool.query(
                "SELECT * FROM public.usuario WHERE username = $1 OR email = $2",
                [username, email]
            );
            
            if (usuarioExistente.rows.length > 0) {
                return res.status(400).json({ error: 'El usuario o email ya existe' });
            }

            // Hash password
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);

            // Verificar si es el primer usuario
            const totalUsuarios = await pool.query("SELECT COUNT(*) as total FROM public.usuario");
            const count = parseInt(totalUsuarios.rows[0].total);
            
            let usuarioData = {
                username,
                password_hash,
                email,
                id_rol
            };

            if (count === 0 && id_rol === 1) {
                // Primer usuario administrador - auto-aprobado
                usuarioData.activo = true;
                usuarioData.pendiente_aprobacion = false;
            } else {
                // Otros usuarios quedan pendientes
                usuarioData.activo = false;
                usuarioData.pendiente_aprobacion = true;
            }

            const result = await pool.query(
                `INSERT INTO public.usuario 
                 (username, password_hash, email, id_rol, activo, pendiente_aprobacion) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [usuarioData.username, usuarioData.password_hash, usuarioData.email, 
                 usuarioData.id_rol, usuarioData.activo, usuarioData.pendiente_aprobacion]
            );
            
            const usuarioCreado = result.rows[0];
            
            res.status(201).json({ 
                mensaje: usuarioData.activo ? 
                    'Usuario administrador creado exitosamente.' : 
                    'Usuario creado exitosamente. Pendiente de aprobación.',
                usuario: {
                    id_usuario: usuarioCreado.id_usuario,
                    username: usuarioCreado.username,
                    email: usuarioCreado.email,
                    pendiente_aprobacion: usuarioCreado.pendiente_aprobacion
                }
            });

        } catch (error) {
            console.error('Error en crearUsuario:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener usuarios pendientes de aprobación
    obtenerPendientes: async (req, res) => {
        try {
            const aprobadorRol = req.user.id_rol;
            
            // Roles que puede aprobar según su rol
            const rolesAprobables = {
                1: [2, 3, 4], // Admin puede aprobar todos
                2: [3, 4],    // Gerente puede aprobar docente y estudiante
                3: [4]        // Docente puede aprobar estudiante
            };
            
            const rolesPermitidos = rolesAprobables[aprobadorRol] || [];
            
            if (rolesPermitidos.length === 0) {
                return res.json([]);
            }
            
            // Convertir array a string para la consulta SQL
            const rolesString = rolesPermitidos.join(',');
            
            const result = await pool.query(
                `SELECT u.*, r.nombre_rol 
                 FROM public.usuario u
                 JOIN public.rol r ON u.id_rol = r.id_rol
                 WHERE u.pendiente_aprobacion = TRUE 
                 AND u.id_rol IN (${rolesString})
                 ORDER BY u.fecha_solicitud ASC`
            );
            
            res.json(result.rows);
            
        } catch (error) {
            console.error('Error en obtenerPendientes:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Aprobar usuario
    aprobarUsuario: async (req, res) => {
        try {
            const { id } = req.params;
            const idAprobador = req.user.id_usuario;
            const rolAprobador = req.user.id_rol;
            
            // Obtener usuario a aprobar
            const usuarioResult = await pool.query(
                "SELECT * FROM public.usuario WHERE id_usuario = $1",
                [id]
            );
            
            if (usuarioResult.rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            
            const usuario = usuarioResult.rows[0];
            
            if (!usuario.pendiente_aprobacion) {
                return res.status(400).json({ error: 'Usuario no pendiente de aprobación' });
            }
            
            // Verificar permisos de aprobación
            const puedeAprobar = await verificarPermisoAprobacion(rolAprobador, usuario.id_rol);
            if (!puedeAprobar) {
                return res.status(403).json({ error: 'No tienes permisos para aprobar este rol de usuario' });
            }
            
            // Aprobar usuario
            const updateResult = await pool.query(
                `UPDATE public.usuario 
                 SET activo = TRUE, pendiente_aprobacion = FALSE, 
                     id_usuario_aprobador = $1, fecha_aprobacion = $2
                 WHERE id_usuario = $3 RETURNING *`,
                [idAprobador, new Date(), id]
            );
            
            res.json({ 
                mensaje: 'Usuario aprobado exitosamente', 
                usuario: updateResult.rows[0] 
            });
            
        } catch (error) {
            console.error('Error en aprobarUsuario:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

// Función auxiliar para verificar permisos
async function verificarPermisoAprobacion(rolAprobador, rolSolicitante) {
    const permisos = {
        1: [2, 3, 4], // Admin
        2: [3, 4],    // Gerente
        3: [4]        // Docente
    };
    return permisos[rolAprobador]?.includes(rolSolicitante) || false;
}

export default usuarioController;