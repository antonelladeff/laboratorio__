import { Router } from "express";
import * as studyController from "../controllers/study.controllers";
import {
  authMiddleware,
  isBiochemist,
  isAdmin,
} from "@/modules/auth/middlewares/auth.middleware";
import { upload } from "@/config/upload";

const router = Router();

/**
 * @route   POST /api/studies
 * @desc    Crear un nuevo estudio con PDF (solo bioquímicos)
 * @access  Private (Biochemist)
 */
router.post(
  "/",
  authMiddleware,
  isBiochemist,
  upload.single('pdf'), // Middleware de multer para manejar el archivo
  studyController.createStudy
);

/**
 * @route   GET /api/studies/list
 * @desc    Obtener estudios con paginación
 * @access  Private (Biochemist)
 */
// Ruta de paginación eliminada

/**
 * @route   GET /api/studies/biochemist/me
 * @desc    Obtener estudios asignados al bioquímico autenticado
 * @access  Private (Biochemist)
 */
router.get(
  "/biochemist/me",
  authMiddleware,
  isBiochemist,
  studyController.getMyStudies
);

/**
 * @route   GET /api/studies/all
 * @desc    Obtener todos los estudios (solo administradores)
 * @access  Private (Admin)
 */
router.get("/all", authMiddleware, isAdmin, studyController.getAllStudies);

/**
 * @route   GET /api/studies/patient/me
 * @desc    Obtener estudios del paciente autenticado
 * @access  Private (Patient)
 */
router.get(
  "/patient/me",
  authMiddleware,
  studyController.getMyStudiesAsPatient
);

/**
 * @route   GET /api/studies/patient/:dni
 * @desc    Buscar un paciente por DNI
 * @access  Private (Biochemist)
 */
router.get(
  "/patient/:dni",
  authMiddleware,
  isBiochemist,
  studyController.getPatientByDni
);

/**
 * @route   GET /api/studies/:id
 * @desc    Obtener un estudio específico por ID
 * @access  Private
 */
router.get("/:id", authMiddleware, studyController.getStudyById);

/**
 * @route   PATCH /api/studies/:id/status
 * @desc    Actualizar estado de un estudio
 * @access  Private (Biochemist)
 */
router.patch(
  "/:id/status",
  authMiddleware,
  isBiochemist,
  studyController.updateStudyStatus
);

export default router;