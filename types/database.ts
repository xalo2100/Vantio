export type Role = 'admin' | 'ventas' | 'tecnico';
export type Priority = 'baja' | 'media' | 'alta' | 'urgente';
export type Status = 'abierto' | 'asignado' | 'en_proceso' | 'finalizado';

export interface Perfil {
    id: string;
    email: string | null;
    nombre: string | null;
    rol: Role | null;
    especialidad: string | null;
}

export interface Ticket {
    id: number;
    created_at: string;
    cliente_nombre: string;
    descripcion_falla: string;
    prioridad: Priority | null;
    estado: Status | null;
    creado_por: string | null;
    asignado_a: string | null;
}

export interface Reporte {
    id: number;
    ticket_id: number | null;
    tecnico_id: string | null;
    notas_tecnico: string | null;
    reporte_final_ia: string | null;
    repuestos: string | null;
    created_at: string;
}
