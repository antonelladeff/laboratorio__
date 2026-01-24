# 🔧 GUÍA DE IMPLEMENTACIÓN - OPTIMIZACIONES RECOMENDADAS

## 1. ENDPOINT DELETE CON VALIDACIÓN DE PERMISOS (CRÍTICO)

### Backend: Implementar en `study.controllers.ts`
```typescript
/**
 * Controlador para eliminar un estudio
 * Solo el bioquímico asignado puede eliminar
 */
export const deleteStudy = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const studyId = parseInt(id!, 10);

    if (isNaN(studyId)) {
      return ResponseHelper.validationError(res, "ID de estudio inválido");
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
        "Solo el bioquímico asignado puede eliminar este estudio"
      );
    }

    // Eliminar el estudio
    await studyService.deleteStudy(studyId);

    ResponseHelper.success(res, null, "Estudio eliminado exitosamente");
  } catch (error: any) {
    console.error("Error al eliminar estudio:", error);
    ResponseHelper.serverError(res, "Error al eliminar estudio", error);
  }
};
```

### Backend: Agregar en `study.routes.ts`
```typescript
/**
 * @route   DELETE /api/studies/:id
 * @desc    Eliminar un estudio
 * @access  Private (Biochemist)
 */
router.delete(
  "/:id",
  authMiddleware,
  isBiochemist,
  studyController.deleteStudy
);
```

### Frontend: Usar en componentes (Ya está parcialmente implementado)
```typescript
async function handleDelete(id: number | undefined): Promise<void> {
  if (!id) return

  if (confirm('¿Estás seguro?')) {
    try {
      const response = await authFetch(`/api/studies/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Actualizar UI
        showSuccess('Estudio eliminado')
        // Recargar lista
      } else {
        showError('No tienes permiso para eliminar este estudio')
      }
    } catch (error) {
      showError('Error al eliminar')
    }
  }
}
```

---

## 2. MIGRAR DASHBOARD A API (IMPORTANTE)

### Antes: Componente con localStorage
```typescript
// MALO: Dashboard.tsx
const [completados, setCompletados] = useState(0)

useEffect(() => {
  const raw = localStorage.getItem('estudios_metadata')
  const metas = JSON.parse(raw) as EstudioMeta[]
  const completed = metas.filter(m => m.status === 'completado').length
  setCompletados(completed)
}, [])
```

### Después: Hook personalizado + API
```typescript
// hooks/useStudiesStats.ts
export function useStudiesStats() {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    partial: 0,
    inProgress: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await authFetch('/api/studies/biochemist/me')
        const studies = response.data || []

        setStats({
          total: studies.length,
          completed: studies.filter((s: any) => s.status?.name === 'COMPLETED').length,
          partial: studies.filter((s: any) => s.status?.name === 'PARTIAL').length,
          inProgress: studies.filter((s: any) => s.status?.name === 'IN_PROGRESS').length
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  return { stats, loading }
}

// Dashboard.tsx
export default function Dashboard() {
  const { stats, loading } = useStudiesStats()
  
  if (loading) return <div>Cargando...</div>
  
  return (
    <div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total" value={stats.total} />
        <StatCard title="Completados" value={stats.completed} color="green" />
        <StatCard title="Parciales" value={stats.partial} color="yellow" />
        <StatCard title="En proceso" value={stats.inProgress} color="blue" />
      </div>
    </div>
  )
}
```

---

## 3. IMPLEMENTAR ERROR BOUNDARIES (UX CRÍTICA)

### Crear componente ErrorBoundary
```typescript
// components/ErrorBoundary.tsx
'use client'

import React, { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h1 className="text-xl font-bold text-red-600">Algo salió mal</h1>
            </div>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

### Usar en layout principal
```typescript
// app/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ErrorBoundary>
          {/* Tu contenido aquí */}
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
```

---

## 4. SISTEMA GLOBAL DE NOTIFICACIONES

### Hook personalizado
```typescript
// hooks/useNotification.ts
import { useState, useCallback } from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const show = useCallback((
    message: string,
    type: NotificationType = 'info',
    duration = 3000
  ) => {
    const id = Math.random().toString(36)
    
    setNotifications(prev => [...prev, { id, message, type, duration }])
    
    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
  }, [])

  return { notifications, show }
}

// Componente para mostrar notificaciones
export function NotificationCenter({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {notifications.map(notif => (
        <div
          key={notif.id}
          className={`px-4 py-3 rounded-lg text-white shadow-lg ${
            notif.type === 'success' ? 'bg-green-500' :
            notif.type === 'error' ? 'bg-red-500' :
            notif.type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}
        >
          {notif.message}
        </div>
      ))}
    </div>
  )
}
```

### Usar en app
```typescript
// app/layout.tsx
'use client'

import { useNotification, NotificationCenter } from '@/hooks/useNotification'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { notifications, show } = useNotification()
  
  // Hacer disponible globalmente vía context
  return (
    <NotificationContext.Provider value={{ show }}>
      {children}
      <NotificationCenter notifications={notifications} />
    </NotificationContext.Provider>
  )
}

// Usar en cualquier componente
import { useContext } from 'react'

export function MyComponent() {
  const { show } = useContext(NotificationContext)
  
  const handleSave = async () => {
    try {
      const response = await authFetch('/api/studies', { method: 'POST' })
      show('Estudio guardado correctamente', 'success')
    } catch (error) {
      show('Error al guardar estudio', 'error')
    }
  }
  
  return <button onClick={handleSave}>Guardar</button>
}
```

---

## 5. PAGINACIÓN EN BACKEND

### Actualizar servicio
```typescript
// modules/studies/services/study.services.ts
export async function getStudiesWithPagination(
  biochemistId: number,
  page: number = 1,
  limit: number = 10,
  status?: string
) {
  const skip = (page - 1) * limit

  const where: any = { biochemistId }
  if (status) {
    where.status = { name: status }
  }

  const [studies, total] = await Promise.all([
    prisma.study.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          include: { profile: true }
        },
        status: true
      },
      orderBy: { studyDate: 'desc' }
    }),
    prisma.study.count({ where })
  ])

  return {
    studies,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit)
    }
  }
}
```

### Ruta paginada
```typescript
router.get('/list', authMiddleware, isBiochemist, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const status = req.query.status as string | undefined

    const result = await studyService.getStudiesWithPagination(
      req.user!.id,
      page,
      limit,
      status
    )

    ResponseHelper.success(res, result)
  } catch (error: any) {
    ResponseHelper.serverError(res, error)
  }
})
```

### Hook en frontend
```typescript
// hooks/useStudiesList.ts
export function useStudiesList(page = 1, limit = 10, status?: string) {
  const [studies, setStudies] = useState<Study[]>([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStudies = async () => {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        })
        if (status) params.append('status', status)

        const response = await authFetch(`/api/studies/list?${params}`)
        const data = await response.json()

        setStudies(data.data.studies)
        setPagination(data.data.pagination)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadStudies()
  }, [page, limit, status])

  return { studies, pagination, loading }
}
```

---

## 6. BÚSQUEDA Y FILTRADO AVANZADO

### Backend - Servicio mejorado
```typescript
export async function searchStudies(
  biochemistId: number,
  options: {
    query?: string           // Busca en DNI, nombre, apellido, estudio
    status?: string          // Filtro por estado
    startDate?: Date         // Desde fecha
    endDate?: Date           // Hasta fecha
    page?: number
    limit?: number
    sortBy?: 'date' | 'name' | 'status'
    sortOrder?: 'asc' | 'desc'
  }
) {
  const {
    query,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'date',
    sortOrder = 'desc'
  } = options

  const where: any = { biochemistId }

  // Filtro por texto
  if (query) {
    where.OR = [
      { user: { profile: { firstName: { contains: query, mode: 'insensitive' } } } },
      { user: { profile: { lastName: { contains: query, mode: 'insensitive' } } } },
      { user: { profile: { documentNumber: { contains: query } } } },
      { studyName: { contains: query, mode: 'insensitive' } }
    ]
  }

  // Filtro por estado
  if (status) {
    where.status = { name: status }
  }

  // Filtro por rango de fechas
  if (startDate || endDate) {
    where.studyDate = {}
    if (startDate) where.studyDate.gte = startDate
    if (endDate) where.studyDate.lte = endDate
  }

  // Ordenamiento
  const orderBy: any = {}
  if (sortBy === 'date') orderBy.studyDate = sortOrder
  else if (sortBy === 'name') orderBy.user = { profile: { firstName: sortOrder } }
  else if (sortBy === 'status') orderBy.status = { name: sortOrder }

  const skip = (page - 1) * limit

  const [studies, total] = await Promise.all([
    prisma.study.findMany({
      where,
      include: { user: { include: { profile: true } }, status: true },
      orderBy,
      skip,
      take: limit
    }),
    prisma.study.count({ where })
  ])

  return {
    studies,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}
```

---

## RESUMEN DE CAMBIOS

| Cambio | Archivo | Líneas | Complejidad |
|--------|---------|--------|-------------|
| DELETE endpoint | study.controllers.ts | +30 | 🟢 Baja |
| DELETE ruta | study.routes.ts | +5 | 🟢 Baja |
| Error Boundary | components/ErrorBoundary.tsx | +60 | 🟢 Baja |
| useNotification | hooks/useNotification.ts | +80 | 🟡 Media |
| Migrar Dashboard | componentes/Dashboard.tsx | +40 | 🟡 Media |
| Paginación | modules/studies/ | +50 | 🟡 Media |
| Búsqueda | modules/studies/ | +70 | 🟡 Media |

**Tiempo total estimado**: 12-15 horas  
**Impacto**: 🚀 Muy alto en UX, seguridad y rendimiento
