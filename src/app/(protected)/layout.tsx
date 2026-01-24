"use client";

import { Sidebar } from "@/componentes/SideBar";
import { useAuth } from "@/utils/useAuth";
import { useRouter } from "next/navigation";

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { isAuthenticated, isLoading, userType } = useAuth();

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
        return null;
    }

    // Redirige a la vista de paciente si el usuario tiene rol de paciente
    if (userType === "patient") {
        router.replace("/paciente/dashboard");
        return null;
    }

    return (
        <>
            <Sidebar />
            <div className="ml-64 min-h-screen overflow-auto bg-gray-100">
                {children}
            </div>
        </>
    );
}
