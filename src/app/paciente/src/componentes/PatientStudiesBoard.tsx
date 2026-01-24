"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, FileText, Loader2, Share2 } from "lucide-react"
import authFetch from "@/utils/authFetch"

export type StudyStatus = "completed" | "in-progress" | "pending" | "partial"
export type StudyFilter = "all" | StudyStatus | "open"

export type Study = {
  id: string
  patientName: string
  dni: string
  date: string
  status: StudyStatus
  obraSocial: string
  medico: string
  pdfUrl?: string
}

const statusConfig: Record<StudyStatus, { label: string; badgeClass: string; dotClass: string }> = {
  "completed": {
    label: "Completado",
    badgeClass: "bg-green-100 text-green-700",
    dotClass: "bg-green-500",
  },
  "in-progress": {
    label: "En proceso",
    badgeClass: "bg-orange-100 text-orange-700",
    dotClass: "bg-orange-500",
  },
  "pending": {
    label: "Pendiente",
    badgeClass: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
  },
  "partial": {
    label: "Parcial",
    badgeClass: "bg-yellow-100 text-yellow-700",
    dotClass: "bg-yellow-500",
  },
}

const filters: { id: StudyFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "completed", label: "Completados" },
  { id: "in-progress", label: "En proceso" },
  { id: "pending", label: "Pendientes" },
  { id: "open", label: "En curso" },
]

type Props = {
  title?: string
  subtitle?: string
  initialFilter?: StudyFilter
  emptyHint?: string
}

function formatDate(value?: string) {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function mapStatus(name?: string): StudyStatus {
  if (!name) return "pending"
  const normalized = name.toUpperCase()

  // Log para debugging
  if (typeof window !== 'undefined') {
    console.log("Status recibido del backend:", name, "->", normalized)
  }

  if (normalized === "COMPLETED" || normalized === "COMPLETADO") return "completed"
  if (normalized === "IN_PROGRESS" || normalized === "EN_PROCESO" || normalized === "INPROGRESS") return "in-progress"
  if (normalized === "PARTIAL" || normalized === "PARCIAL") return "partial"
  if (normalized === "PENDING" || normalized === "PENDIENTE") return "pending"

  // Si no coincide con ninguno, asumimos que es el estado por defecto
  console.warn("Estado desconocido:", name)
  return "pending"
}

export default function PatientStudiesBoard({
  title = "¡Bienvenido!",
  subtitle = "Revisa tus resultados y el estado de tus estudios.",
  initialFilter = "all",
  emptyHint = "No hay estudios para mostrar aún.",
}: Props) {
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<StudyFilter>(initialFilter)

  useEffect(() => {
    let mounted = true
    const loadStudies = async () => {
      try {
        const response = await authFetch("http://localhost:3000/api/studies/patient/me")
        if (!response.ok) {
          console.error("Error fetching studies:", response.statusText)
          return
        }
        const result = await response.json()
        const backendStudies = result?.data || []

        const transformed: Study[] = backendStudies.map((s: any) => ({
          id: s.id?.toString() || crypto.randomUUID(),
          patientName: `${s.patient?.profile?.firstName || ""} ${s.patient?.profile?.lastName || ""}`.trim() || "Paciente",
          dni: s.patient?.dni || "-",
          date: formatDate(s.studyDate),
          status: mapStatus(s.status?.name),
          obraSocial: s.socialInsurance || "Sin obra social",
          medico: s.biochemist ? `${s.biochemist.profile?.firstName || ""} ${s.biochemist.profile?.lastName || ""}`.trim() : "Sin asignar",
          pdfUrl: s.pdfUrl ? `http://localhost:3000${s.pdfUrl}` : undefined,
        }))

        if (mounted) setStudies(transformed)
      } catch (e) {
        console.error("Error loading studies:", e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadStudies()
    return () => {
      mounted = false
    }
  }, [])

  const stats = useMemo(() => {
    const totals = { total: studies.length, completed: 0, inProgress: 0, pending: 0, partial: 0 }
    studies.forEach((s) => {
      if (s.status === "completed") totals.completed += 1
      else if (s.status === "in-progress") totals.inProgress += 1
      else if (s.status === "partial") totals.partial += 1
      else totals.pending += 1
    })
    return totals
  }, [studies])

  const filteredStudies = useMemo(() => {
    if (activeFilter === "all") return studies
    if (activeFilter === "open") return studies.filter((s) => s.status !== "completed")
    return studies.filter((s) => s.status === activeFilter)
  }, [activeFilter, studies])

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-gray-500">Paciente</p>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Estudios totales", value: stats.total }, { label: "Completados", value: stats.completed }, { label: "En proceso", value: stats.inProgress }, { label: "Pendientes", value: stats.pending + stats.partial }].map((item) => (
          <div key={item.label} className="rounded-lg bg-white border border-gray-200 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mis estudios</h2>
            <p className="text-sm text-gray-600">Descarga los resultados o revisa el estado de cada estudio.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.id
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${isActive ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="rounded-xl border border-gray-200 bg-gray-50 p-4 animate-pulse" />
              ))}
            </div>
          ) : filteredStudies.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
              {emptyHint}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStudies.map((study) => {
                const status = statusConfig[study.status]
                const isProcessing = study.status === "in-progress" || study.status === "pending" || study.status === "partial"

                return (
                  <article key={study.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{study.patientName}</p>
                          <p className="text-sm text-gray-600">DNI: {study.dni}</p>
                        </div>

                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status.badgeClass}`}>
                          <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                          {status.label}
                        </span>

                        <div>
                          <p className="text-xs text-gray-500">Fecha</p>
                          <p className="text-sm text-gray-900">{study.date}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Obra social</p>
                          <p className="text-sm text-gray-900">{study.obraSocial}</p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Médico</p>
                          <p className="text-sm text-gray-900">{study.medico}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start lg:self-auto">
                        {isProcessing ? (
                          <span className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Procesando...
                          </span>
                        ) : (
                          <>
                            <a
                              href={study.pdfUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => !study.pdfUrl && e.preventDefault()}
                              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${study.pdfUrl
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "cursor-not-allowed bg-gray-200 text-gray-500"
                                }`}
                            >
                              <FileText className="h-4 w-4" />
                              {study.pdfUrl ? "Ver PDF" : "Sin PDF"}
                            </a>

                            <button
                              type="button"
                              className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${study.pdfUrl ? "border-gray-200 text-gray-600 hover:bg-gray-50" : "cursor-not-allowed border-gray-200 text-gray-400"
                                }`}
                              disabled={!study.pdfUrl}
                            >
                              <Share2 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${study.pdfUrl ? "border-gray-200 text-gray-600 hover:bg-gray-50" : "cursor-not-allowed border-gray-200 text-gray-400"
                                }`}
                              disabled={!study.pdfUrl}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
