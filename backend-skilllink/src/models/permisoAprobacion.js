/*
import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const PermisoAprobacion = db.define('permiso_aprobacion', {
    id_permiso: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_rol_aprobador: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_rol_solicitante: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nivel_prioridad: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}, {
    tableName: 'permiso_aprobacion',
    timestamps: false
});

export default PermisoAprobacion;*/