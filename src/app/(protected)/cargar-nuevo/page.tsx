
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from 'next/navigation'
import authFetch from '@/utils/authFetch'
import { CargarNuevo } from "@/componentes/Cargar-Nuevo"
import { RevisarEstudio } from "@/componentes/Revisar-Estudio"
import Toast from '@/componentes/Toast'
import type { EstudioData } from "../revision/page"

export default function Page() {
    const [currentView, setCurrentView] = useState<"cargar" | "revisar">("cargar")
    const [estudioData, setEstudioData] = useState<EstudioData | null>(null)
    const [toastMessage, setToastMessage] = useState<string>('')
    const [showToast, setShowToast] = useState<boolean>(false)
    const [loading, setLoading] = useState(false)

    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        const loadStudy = async () => {
            try {
                const id = searchParams?.get('id')
                if (!id) return

                setLoading(true)

                // Primero intenta cargar desde localStorage (flujo local)
                const raw = localStorage.getItem('estudios_metadata')
                const metas = raw ? JSON.parse(raw) as Array<Record<string, any>> : []
                const localFound = metas.find(m => m.id === id)

                if (localFound) {
                    setEstudioData(localFound as EstudioData)
                    setCurrentView('cargar')
                    return
                }

                // Si no está en localStorage, intenta cargar desde la API (estudios de BD)
                const response = await authFetch(`http://localhost:3000/api/studies/${id}`)
                if (response.ok) {
                    const result = await response.json()
                    const study = result.data || result

                    // Mapear los datos del backend al formato EstudioData
                    const estudio: EstudioData = {
                        nombreApellido: study.patient?.profile
                            ? `${study.patient.profile.firstName || ''} ${study.patient.profile.lastName || ''}`.trim()
                            : 'Sin nombre',
                        dni: study.patient?.documentNumber || study.patient?.dni || '',
                        fecha: study.studyDate ? new Date(study.studyDate).toISOString().split('T')[0] : '',
                        obraSocial: study.socialInsurance || '',
                        medico: study.biochemist?.profile
                            ? `${study.biochemist.profile.firstName || ''} ${study.biochemist.profile.lastName || ''}`.trim()
                            : '',
                        pdfFile: null,
                        pdfUrl: study.pdfUrl ? `http://localhost:3000${study.pdfUrl}` : '',
                        id: study.id?.toString(),
                        status: study.status?.name?.toLowerCase().includes('completed') ? 'completado'
                            : study.status?.name?.toLowerCase().includes('partial') ? 'parcial'
                                : 'en-proceso'
                    }

                    setEstudioData(estudio)
                    setCurrentView('cargar')
                }
            } catch (e) {
                console.error('[cargar-nuevo] error loading study:', e)
            } finally {
                setLoading(false)
            }
        }

        loadStudy()
    }, [searchParams])

    const handleCargarEstudio = (data: EstudioData, opts?: { autoComplete?: boolean }) => {
        // Actualizar el estudio en la BD
        const updateStudy = async () => {
            try {
                if (!data.id) {
                    console.warn('No study ID provided')
                    return
                }

                const formData = new FormData()
                if (data.pdfFile) {
                    formData.append('pdf', data.pdfFile)
                }

                const response = await authFetch(`http://localhost:3000/api/studies/${data.id}`, {
                    method: 'PATCH',
                    body: formData
                })

                if (!response.ok) {
                    throw new Error('Error actualizando estudio')
                }

                setToastMessage('Estudio actualizado exitosamente')
                setShowToast(true)

                setTimeout(() => {
                    router.push('/estudios/proceso')
                }, 600)
            } catch (e) {
                console.error('Error actualizando estudio:', e)
                setToastMessage('Error al actualizar estudio')
                setShowToast(true)
            }
        }

        if (opts?.autoComplete) {
            updateStudy()
            return
        }

        setEstudioData(data)
        setCurrentView('revisar')
    }

    const handleVolver = () => {
        setCurrentView("cargar")
        setEstudioData(null)
    }

    const handleCompletado = () => {
        if (!estudioData) return

        const updateStatus = async () => {
            try {
                const response = await authFetch(`http://localhost:3000/api/studies/${estudioData.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'COMPLETED' })
                })

                if (!response.ok) {
                    throw new Error('Error marcando como completado')
                }

                setToastMessage('Estudio marcado como completado')
                setShowToast(true)

                setTimeout(() => {
                    setEstudioData(null)
                    router.push('/estudios/completados')
                }, 600)
            } catch (e) {
                console.error('Error marcando como completado:', e)
                setToastMessage('Error al marcar como completado')
                setShowToast(true)
            }
        }

        updateStatus()
    }

    const handleParcial = () => {
        if (!estudioData) return

        const updateStatus = async () => {
            try {
                const response = await authFetch(`http://localhost:3000/api/studies/${estudioData.id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'PARTIAL' })
                })

                if (!response.ok) {
                    throw new Error('Error marcando como parcial')
                }

                setToastMessage('Estudio marcado como parcial')
                setShowToast(true)

                setTimeout(() => {
                    setEstudioData(null)
                    router.push('/estudios/parciales')
                }, 600)
            } catch (e) {
                console.error('Error marcando como parcial:', e)
                setToastMessage('Error al marcar como parcial')
                setShowToast(true)
            }
        }

        updateStatus()
    }


    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            {loading ? (
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">Cargando estudio...</p>
                </div>
            ) : currentView === "cargar" && (
                <CargarNuevo onCargarEstudio={handleCargarEstudio} initialData={estudioData ?? undefined} initialId={estudioData?.id} />
            )}
            {currentView === "revisar" && estudioData && (
                <RevisarEstudio
                    estudioData={estudioData}
                    onVolver={handleVolver}
                    onCompletado={handleCompletado}
                    onParcial={handleParcial}
                />
            )}
            <Toast message={toastMessage} type="success" show={showToast} onClose={() => setShowToast(false)} />
        </div>
    )
}
