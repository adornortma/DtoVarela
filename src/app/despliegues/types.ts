export interface Estado {
  id: string;
  nombre: string;
  color_hex: string;
  activo: boolean;
}

export interface TipoActividad {
  id: string;
  nombre: string;
  codigo_sufijo: string;
  activo: boolean;
}

export interface Sigest {
  id: string;
  numero_sigest: string;
  central: string;
  tipo?: 'balanceado' | 'desbalanceado' | null;
  material_requerido?: Record<string, number> | null;
  material_entregado?: Record<string, number> | null;
  material_usado?: Record<string, number> | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface Cto {
  id: string;
  sigest_id: string;
  codigo: string;
  direccion: string;
  pelo_cto?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface Actividad {
  id: string;
  cto_id: string;
  tipo_actividad_id: string;
  estado_id: string;
  observaciones?: string | null;
  tecnico_nombre?: string | null;
  fecha_estado: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  // Relaciones cargadas
  despliegues_tipos_actividad?: TipoActividad;
  despliegues_estados?: Estado;
}

export interface Material {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface ActividadMaterial {
  actividad_id: string;
  material_id: string;
  cantidad: number;
  origen?: string | null;
  materiales?: Material;
}

export interface Foto {
  id: string;
  actividad_id: string;
  url: string;
  usuario: string;
  fecha_subida: string;
}

export interface HistorialDespliegue {
  id: string;
  actividad_id: string;
  usuario: string;
  fecha: string;
  accion: string; // 'CAMBIO_ESTADO', 'SUBIO_FOTO', 'ELIMINO_FOTO', 'AGREGO_MATERIAL', 'EDITO_OBSERVACION'
  estado_anterior: string;
  estado_nuevo: string;
  observaciones?: string | null;
}

export interface SigestStats {
  numero_sigest: string;
  central: string;
  totalCtos: number;
  instaladas: number;
  certificadas: number;
  pendientes: number;
  avancePorcentaje: number;
  estadoGeneral: 'No iniciado' | 'En ejecución' | 'Finalizado';
}
