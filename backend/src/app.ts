import express from 'express';
import cors from 'cors';
import routes from './routes';
import path from 'path';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Configurar CORS con origenes permitidos
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()) || ['http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (PDFs)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api', routes);

// Manejo de errores para multer
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'Error al subir el archivo',
      error: err.message
    });
  } else if (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Error interno del servidor'
    });
  }
  return next();
});

export default app;