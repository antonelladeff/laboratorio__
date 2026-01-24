import { Request, Response } from "express";
import * as studyService from "../services/study.services";
import * as studyFormatter from "../formatters/study.formatter";
import {
  createStudySchema,
  updateStudyStatusSchema,
} from "../validators/study.validators";
import { ResponseHelper } from "../helpers/response.helper";
import { ValidationHelper } from "../helpers/validation.helper";

/**
 * Controlador para crear un nuevo estudio
 * Solo accesible por bioquímicos autenticados
 */
export const createStudy = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Obtener el archivo subido
    const uploadedFile = req.file;

    // Generar la URL del PDF si se subió un archivo
    const pdfUrl = uploadedFile
      ? `/uploads/pdfs/${uploadedFile.filename}`
      : undefined;

    console.log('Archivo recibido:', uploadedFile);
    console.log('Body recibido:', req.body);

    // Validar datos de entrada
    const validatedData = ValidationHelper.validate<{
      dni: string;
      studyName: string;
      studyDate: string;
      socialInsurance?: string;
      biochemistId?: number;
    }>(createStudySchema, req.body, res);
    if (!validatedData) return;

    const { dni, studyName, studyDate, socialInsurance, biochemistId } = validatedData;

    // Verificar que el paciente existe
    const patient = await studyService.getPatientByDni(dni);
    if (!patient) {
      return ResponseHelper.notFound(res, "Paciente con el DNI proporcionado");
    }

    // Si se proporciona biochemistId, verificar que existe y es un bioquímico
    if (biochemistId) {
      const biochemist = await studyService.getBiochemistById(biochemistId);
      if (!biochemist) {
        return ResponseHelper.notFound(res, "Bioquímico");
      }
      if (biochemist.role.name !== "BIOCHEMIST") {
        return ResponseHelper.validationError(
          res,
          "El usuario especificado no es un bioquímico"
        );
      }
    }

    // Obtener el estado inicial
    const inProgressStatus = await studyService.getStatusByName("IN_PROGRESS");
    if (!inProgressStatus) {
      return ResponseHelper.serverError(
        res,
        "Error de configuración: Estado 'IN_PROGRESS' no encontrado"
      );
    }

    // Crear el estudio
    const studyData = {
      userId: patient.id,
      studyName,
      studyDate: new Date(studyDate),
      socialInsurance,
      statusId: inProgressStatus.id,
      pdfUrl, // Incluir la URL del PDF
      biochemistId: biochemistId || req.user?.id,
    };

    const study = await studyService.createStudy(studyData);
    const formattedStudy = studyFormatter.formatStudy(study);

    ResponseHelper.created(res, formattedStudy, "Estudio creado exitosamente");
  } catch (error: any) {
    console.error("Error al crear estudio:", error);
    ResponseHelper.serverError(res, "Error al crear el estudio", error);
  }
};

/**
 * Controlador para obtener los estudios del bioquímico autenticado
 * Solo accesible por bioquímicos autenticados
 */
export const getMyStudies = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const biochemistId = req.user?.id;

    if (!biochemistId) {
      return ResponseHelper.unauthorized(res, "Usuario no autenticado");
    }

    const studies = await studyService.getStudiesByBiochemist(biochemistId);
    const formattedStudies = studies.map(studyFormatter.formatStudy);

    ResponseHelper.success(res, formattedStudies, "Estudios obtenidos exitosamente");
  } catch (error: any) {
    console.error("Error al obtener estudios del bioquímico:", error);
    ResponseHelper.serverError(res, "Error al obtener estudios", error);
  }
};

/**
 * Controlador para obtener todos los estudios
 * Solo accesible por administradores
 */
export const getAllStudies = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const studies = await studyService.getAllStudies();
    const formattedStudies = studies.map(studyFormatter.formatStudy);

    ResponseHelper.success(res, formattedStudies, "Todos los estudios obtenidos exitosamente");
  } catch (error: any) {
    console.error("Error al obtener todos los estudios:", error);
    ResponseHelper.serverError(res, "Error al obtener estudios", error);
  }
};

/**
 * Controlador para obtener un estudio específico por ID
 */
export const getStudyById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const studyId = parseInt(id!, 10);

    if (isNaN(studyId)) {
      return ResponseHelper.validationError(res, "ID de estudio inválido");
    }

    const study = await studyService.getStudyById(studyId);

    if (!study) {
      return ResponseHelper.notFound(res, "Estudio");
    }

    // Verificar permisos: solo el bioquímico asignado o admin pueden ver el estudio
    if (study.biochemistId !== req.user?.id && req.user?.role?.name !== "ADMIN") {
      return ResponseHelper.forbidden(res, "No tienes permiso para ver este estudio");
    }

    const formattedStudy = studyFormatter.formatStudy(study);

    ResponseHelper.success(res, formattedStudy, "Estudio obtenido exitosamente");
  } catch (error: any) {
    console.error("Error al obtener estudio:", error);
    ResponseHelper.serverError(res, "Error al obtener estudio", error);
  }
};

/**
 * Controlador para obtener los estudios del paciente autenticado
 * Solo accesible por pacientes autenticados
 */
export const getMyStudiesAsPatient = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const patientId = req.user?.id;

    if (!patientId) {
      return ResponseHelper.unauthorized(res, "Usuario no autenticado");
    }

    const studies = await studyService.getStudiesByPatient(patientId);
    const formattedStudies = studies.map(studyFormatter.formatStudy);

    ResponseHelper.success(res, formattedStudies, "Estudios obtenidos exitosamente");
  } catch (error: any) {
    console.error("Error al obtener estudios del paciente:", error);
    ResponseHelper.serverError(res, "Error al obtener estudios", error);
  }
};

/**
 * Controlador para actualizar el estado de un estudio
 * Solo accesible por el bioquímico asignado
 */
export const updateStudyStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const studyId = parseInt(id!, 10);

    if (isNaN(studyId)) {
      return ResponseHelper.validationError(res, "ID de estudio inválido");
    }

    // Validar datos de entrada
    const validatedData = ValidationHelper.validate<{
      statusName: string;
    }>(updateStudyStatusSchema, req.body, res);
    if (!validatedData) return;

    const { statusName } = validatedData;

    // Obtener el estado por nombre
    const status = await studyService.getStatusByName(statusName);
    if (!status) {
      return ResponseHelper.notFound(res, "Estado");
    }

    // Obtener el estudio
    const study = await studyService.getStudyById(studyId);

    if (!study) {
      return ResponseHelper.notFound(res, "Estudio");
    }

    // Verificar que el usuario es el bioquímico asignado
    if (study.biochemistId !== req.user?.id) {
      return ResponseHelper.forbidden(
        res,
        "Solo el bioquímico asignado puede actualizar el estado de este estudio"
      );
    }

    // Actualizar el estado
    const updatedStudy = await studyService.updateStudyStatus(studyId, {
      statusId: status.id,
    });

    const formattedStudy = studyFormatter.formatStudy(updatedStudy);

    ResponseHelper.success(res, formattedStudy, "Estudio actualizado exitosamente");
  } catch (error: any) {
    console.error("Error al actualizar estudio:", error);
    ResponseHelper.serverError(res, "Error al actualizar estudio", error);
  }
};

/**
 * Controlador para buscar un paciente por DNI
 * Solo accesible por bioquímicos autenticados
 */
export const getPatientByDni = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { dni } = req.params;

    if (!dni || dni.trim() === "") {
      return ResponseHelper.validationError(res, "DNI es requerido");
    }

    // Buscar el paciente
    const patient = await studyService.getPatientByDni(dni.trim());

    if (!patient) {
      return ResponseHelper.notFound(res, "Paciente con el DNI proporcionado");
    }

    // Retornar los datos del paciente
    ResponseHelper.success(res, {
      id: patient.id,
      dni: dni,
      firstName: patient.profile?.firstName,
      lastName: patient.profile?.lastName,
      email: patient.email,
    }, "Paciente encontrado exitosamente");
  } catch (error: any) {
    console.error("Error al buscar paciente:", error);
    ResponseHelper.serverError(res, "Error al buscar paciente", error);
  }
};

// Controlador de paginación eliminado