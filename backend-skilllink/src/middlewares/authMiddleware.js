import jwt from 'jsonwebtoken';

const verificarToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'skilllink_secret');
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ error: 'Token inválido.' });
    }
};

const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.user.id_rol)) {
            return res.status(403).json({ error: 'Acceso denegado. Rol no autorizado.' });
        }
        next();
    };
};

export { verificarToken, verificarRol };