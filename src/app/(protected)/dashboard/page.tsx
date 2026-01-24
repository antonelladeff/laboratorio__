"use client";

import Dashboard from "@/componentes/Dashboard";
import { Sidebar } from "@/componentes/SideBar";
import { useAuth } from "@/utils/useAuth";
import { useRouter } from "next/navigation";

export default function Page() {
    const router = useRouter();
    const { isAuthenticated, isLoading, userType, userData, logout } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-gray-600">Verificando autenticación...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // El hook redirigirá automáticamente
    }

    // Si el usuario es paciente, lo enviamos a su panel específico
    if (userType === "patient") {
        router.replace("/paciente/dashboard");
        return null;
    }

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1">
                <Dashboard />
            </div>
        </div>
    );
}
