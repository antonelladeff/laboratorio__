"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import authFetch from '@/utils/authFetch'
import { cardClasses, leftColClasses, nameClasses, metaClasses, rightActionsClasses, btnPrimary, badgeEnProceso, iconBtn } from '@/utils/uiClasses'
import { Trash2 } from 'lucide-react'

type Meta = {
    id?: number | string
    studyName?: string
    studyDate?: string
    socialInsurance?: string
    status?: {
        name: string
    }
    patient?: {
        dni?: string
        profile?: {
            firstName?: string
            lastName?: string
            documentNumber?: string
        }
    }
    biochemist?: {
        profile?: {
            firstName?: string
            lastName?: string
        }
    }
}

export default function ProcesoPage() {
    const [items, setItems] = useState<Meta[]>([])
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        let mounted = true

        async function load() {
            try {
                const response = await authFetch('http://localhost:3000/api/studies/biochemist/me')
                if (!response.ok) {
                    throw new Error('Error al cargar estudios')
                }
                const result = await response.json()
                const studies = result.data || []
                const proceso = studies.filter((study: Meta) => study.status?.name === 'IN_PROGRESS')
                if (mounted) setItems(proceso)
            } catch (e) {
                console.warn('[proceso] no se pudo cargar estudios', e)
                if (mounted) setItems([])
            } finally {
                if (mounted) setLoading(false)
            }
        }
        load()
        return () => { mounted = false }
    }, [])

    if (!mounted) return null

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="mt-2 text-gray-600">Cargando estudios en proceso...</p>
                </div>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="p-8">
                <div className="bg-white rounded-lg p-8 shadow">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Estudios en proceso</h1>
                    <p className="text-gray-600">No hay estudios en proceso. Podés crear uno desde el Dashboard o desde "Cargar nuevo".</p>
                </div>
            </div>
        )
    }

    const handleDelete = async (id?: number | string) => {
        if (!id) return
        if (!confirm('¿Eliminar estudio en proceso?')) return
        try {
            const response = await authFetch(`http://localhost:3000/api/studies/${id}`, {
                method: 'DELETE'
            })
            if (response.ok) {
                setItems(prev => prev.filter(p => p.id !== id))
                alert('Estudio eliminado exitosamente')
            } else {
                alert('No se pudo eliminar el estudio')
            }
        } catch (e) {
            console.error('Error eliminando estudio en proceso', e)
        }
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Estudios en proceso</h1>
                <p className="text-gray-600 mt-1">Estudios que están siendo procesados</p>
            </div>
            <div className="space-y-4">
                {items.map(item => {
                    const nombreApellido = item.patient?.profile
                        ? `${item.patient.profile.firstName || ''} ${item.patient.profile.lastName || ''}`.trim()
                        : 'Sin nombre'
                    const dni = item.patient?.dni || item.patient?.profile?.documentNumber || 'Sin DNI'
                    const fecha = item.studyDate ? new Date(item.studyDate).toLocaleDateString('es-AR') : 'Sin fecha'
                    const obraSocial = item.socialInsurance || 'Sin obra social'
                    const estudioNombre = item.studyName || 'Sin nombre'

                    return (
                        <div key={item.id} className={cardClasses}>

                            <div className={leftColClasses}>
                                <div className="flex flex-col gap-1">
                                    <div className={nameClasses}>{nombreApellido}</div>
                                    <div className={metaClasses}>
                                        <span className="truncate">DNI {dni}</span>
                                        <span className="truncate">Fecha {fecha}</span>
                                        <span className="truncate">Obra social {obraSocial}</span>
                                        <span className="truncate">Estudio: {estudioNombre}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={rightActionsClasses}>
                                <span className={badgeEnProceso}>En proceso</span>
                                <Link href={`/cargar-nuevo?id=${item.id}`} className={btnPrimary}>Cargar Estudio</Link>
                                <button onClick={() => handleDelete(item.id)} className={`${iconBtn} hover:bg-red-500`} title="Eliminar estudio">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                        </div>
                    )
                })}
            </div>

            {/* Sin controles de paginación */}
        </div>
    )
}
