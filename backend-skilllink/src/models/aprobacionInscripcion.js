/*
import { DataTypes } from 'sequelize';
import db from '../config/db.js';

const AprobacionInscripcion = db.define('aprobacion_inscripcion', {
    id_aprobacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_inscripcion: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_docente_aprobador: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    estado: {
        type: DataTypes.STRING(20),
        defaultValue: 'pendiente'
    },
    fecha_aprobacion: {
        type: DataTypes.DATE
    },
    comentarios: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'aprobacion_inscripcion',
    timestamps: true
});

export default AprobacionInscripcion;*/