"use client"

import { FileText, Share2, Download } from "lucide-react"

interface Study {
  id: string
  patientName: string
  dni: string
  date: string
  status: "completado" | "en-proceso" | "pendel"
  obraSocial: string
  medico: string
}

const studies: Study[] = [
  {
    id: "1",
    patientName: "FRANCO GRAFF",
    dni: "38374909",
    date: "03/09/2025",
    status: "completado",
    obraSocial: "Osde",
    medico: "Dra Pessi",
  },
  {
    id: "2",
    patientName: "FRANCO GRAFF",
    dni: "38374909",
    date: "02/09/2025",
    status: "en-proceso",
    obraSocial: "Osde",
    medico: "Dra Pessi",
  },
  {
    id: "3",
    patientName: "FRANCO GRAFF",
    dni: "38374909",
    date: "01/09/2025",
    status: "pendel",
    obraSocial: "Osde",
    medico: "Dra Pessi",
  },
]

function getStatusConfig(status: Study["status"]) {
  switch (status) {
    case "completado":
      return { label: "Completado", className: "bg-green-600 text-white" }
    case "en-proceso":
      return { label: "En proceso", className: "bg-orange-500 text-white" }
    case "pendel":
      return { label: "Pendel", className: "bg-red-500 text-white" }
  }
}

export function StudiesGrid() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Mis Estudios</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">
            Filtrar
          </button>
          <button className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">
            Ordenar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {studies.map((study) => {
          const statusConfig = getStatusConfig(study.status)
          const isProcessing = study.status === "en-proceso"

          return (
            <div key={study.id} className="border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-6 flex-1">
                    <div className="min-w-[180px]">
                      <p className="text-sm font-semibold text-gray-900 mb-1">{study.patientName}</p>
                      <p className="text-sm text-gray-600">DNI: {study.dni}</p>
                    </div>

                    <div className="min-w-[100px]">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="min-w-[100px]">
                      <p className="text-xs text-gray-500 mb-1">Fecha</p>
                      <p className="text-sm text-gray-900">{study.date}</p>
                    </div>

                    <div className="min-w-[120px]">
                      <p className="text-xs text-gray-500 mb-1">Obra social</p>
                      <p className="text-sm text-gray-900">{study.obraSocial}</p>
                    </div>

                    <div className="min-w-[120px]">
                      <p className="text-xs text-gray-500 mb-1">Médico</p>
                      <p className="text-sm text-gray-900">{study.medico}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isProcessing ? (
                      <span className="text-sm text-gray-500">Procesando...</span>
                    ) : (
                      <>
                        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md flex items-center gap-2 transition-colors">
                          <FileText className="h-4 w-4" />
                          ver PDF
                        </button>
                        <button className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors">
                          <Share2 className="h-4 w-4 text-gray-600" />
                        </button>
                        <button className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors">
                          <Download className="h-4 w-4 text-gray-600" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
