import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const authController = {
    // Login de usuario
    login: async (req, res) => {
        try {
            const { username, password } = req.body;

            // Buscar usuario con información del rol
            const result = await pool.query(
                `SELECT u.*, r.nombre_rol 
                 FROM public.usuario u
                 JOIN public.rol r ON u.id_rol = r.id_rol
                 WHERE u.username = $1`,
                [username]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            const usuario = result.rows[0];

            // Verificar si está activo
            if (!usuario.activo) {
                return res.status(401).json({ error: 'Usuario pendiente de aprobación' });
            }

            // Verificar contraseña
            const passwordValida = await bcrypt.compare(password, usuario.password_hash);
            if (!passwordValida) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }

            // Generar token
            const token = jwt.sign(
                { 
                    id_usuario: usuario.id_usuario, 
                    username: usuario.username,
                    id_rol: usuario.id_rol,
                    rol: usuario.nombre_rol
                },
                process.env.JWT_SECRET || 'skilllink_secret',
                { expiresIn: '24h' }
            );

            res.json({
                mensaje: 'Login exitoso',
                token,
                usuario: {
                    id_usuario: usuario.id_usuario,
                    username: usuario.username,
                    email: usuario.email,
                    rol: usuario.nombre_rol
                }
            });

        } catch (error) {
            console.error('Error en login:', error);
            res.status(500).json({ error: error.message });
        }
    },

    // Registro de usuario (ya está en usuarioController, pero lo dejamos por si acaso)
    registro: async (req, res) => {
        try {
            // Redirigir al controlador de usuarios
            const usuarioController = await import('./usuarioController.js');
            return usuarioController.default.crearUsuario(req, res);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

export default authController;