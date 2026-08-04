import { supabase } from '@/lib/supabase';
import { 
  Sigest, Cto, Actividad, Estado, TipoActividad, Material, 
  ActividadMaterial, Foto, HistorialDespliegue 
} from '../types';

export const DesplieguesService = {
  // 1. Catálogos
  async getEstados(): Promise<Estado[]> {
    const { data, error } = await supabase
      .from('despliegues_estados')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return data || [];
  },

  async getTiposActividad(): Promise<TipoActividad[]> {
    const { data, error } = await supabase
      .from('despliegues_tipos_actividad')
      .select('*')
      .eq('activo', true);
    if (error) throw error;
    return data || [];
  },

  async getMateriales(): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materiales')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return data || [];
  },

  // 2. SIGEST CRUD
  async getSigests(): Promise<Sigest[]> {
    const { data, error } = await supabase
      .from('sigests')
      .select('*')
      .order('numero_sigest', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createSigest(
    numero_sigest: string, 
    central: string, 
    usuario: string,
    tipo?: 'balanceado' | 'desbalanceado',
    material_requerido?: Record<string, number>,
    material_entregado?: Record<string, number>
  ): Promise<Sigest> {
    const { data, error } = await supabase
      .from('sigests')
      .insert({
        numero_sigest: numero_sigest.trim(),
        central: central.trim(),
        tipo: tipo || 'balanceado',
        material_requerido: material_requerido || {},
        material_entregado: material_entregado || {},
        created_by: usuario,
        updated_by: usuario
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateSigest(
    id: string, 
    numero_sigest: string, 
    central: string, 
    usuario: string,
    tipo?: 'balanceado' | 'desbalanceado',
    material_requerido?: Record<string, number>,
    material_entregado?: Record<string, number>
  ): Promise<Sigest> {
    const { data, error } = await supabase
      .from('sigests')
      .update({
        numero_sigest: numero_sigest.trim(),
        central: central.trim(),
        tipo: tipo || 'balanceado',
        material_requerido: material_requerido || {},
        material_entregado: material_entregado || {},
        updated_by: usuario,
        fecha_actualizacion: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSigest(id: string): Promise<void> {
    const { error } = await supabase
      .from('sigests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // 3. CTO CRUD
  async getCtosBySigest(sigestId: string): Promise<Cto[]> {
    const { data, error } = await supabase
      .from('ctos')
      .select('*')
      .eq('sigest_id', sigestId)
      .order('codigo');
    if (error) throw error;
    return data || [];
  },

  async createCto(sigest_id: string, codigo: string, direccion: string, usuario: string, pelo_cto?: string): Promise<Cto> {
    // 1. Insert CTO
    const { data: cto, error: ctoError } = await supabase
      .from('ctos')
      .insert({
        sigest_id,
        codigo: codigo.trim(),
        direccion: direccion.trim(),
        pelo_cto: pelo_cto ? pelo_cto.trim() : null,
        created_by: usuario,
        updated_by: usuario
      })
      .select()
      .single();
    if (ctoError) throw ctoError;

    try {
      // 2. Fetch seed items to generate activities
      const [tipos, estados] = await Promise.all([
        this.getTiposActividad(),
        this.getEstados()
      ]);

      const pendienteEstado = estados.find(e => e.nombre.toLowerCase() === 'pendiente') || estados[0];
      
      const activitiesToInsert = tipos.map(tipo => ({
        cto_id: cto.id,
        tipo_actividad_id: tipo.id,
        estado_id: pendienteEstado.id,
        created_by: usuario,
        updated_by: usuario
      }));

      if (activitiesToInsert.length > 0) {
        const { error: actError } = await supabase
          .from('actividades')
          .insert(activitiesToInsert);
        if (actError) console.error('Error generating activities automatically:', actError);
      }
    } catch (e) {
      console.error('Error in automatic activity generation:', e);
    }

    return cto;
  },

  async updateCto(id: string, codigo: string, direccion: string, usuario: string, pelo_cto?: string): Promise<Cto> {
    const { data, error } = await supabase
      .from('ctos')
      .update({
        codigo: codigo.trim(),
        direccion: direccion.trim(),
        pelo_cto: pelo_cto ? pelo_cto.trim() : null,
        updated_by: usuario,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCto(id: string): Promise<void> {
    const { error } = await supabase
      .from('ctos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // 4. Actividades y Seguimiento
  async getActividadesByCtoIds(ctoIds: string[]): Promise<Actividad[]> {
    if (ctoIds.length === 0) return [];
    const { data, error } = await supabase
      .from('actividades')
      .select('*, despliegues_tipos_actividad(*), despliegues_estados(*)')
      .in('cto_id', ctoIds);
    if (error) throw error;
    return data || [];
  },

  async getActividadMateriales(actividadIds: string[]): Promise<ActividadMaterial[]> {
    if (actividadIds.length === 0) return [];
    const { data, error } = await supabase
      .from('actividad_materiales')
      .select('*, materiales(*)')
      .in('actividad_id', actividadIds);
    if (error) throw error;
    return data || [];
  },

  async getActividadFotos(actividadIds: string[]): Promise<Foto[]> {
    if (actividadIds.length === 0) return [];
    const { data, error } = await supabase
      .from('fotos')
      .select('*')
      .in('actividad_id', actividadIds)
      .order('fecha_subida', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getHistorialByActividades(actividadIds: string[]): Promise<HistorialDespliegue[]> {
    if (actividadIds.length === 0) return [];
    const { data, error } = await supabase
      .from('historial_despliegues')
      .select('*')
      .in('actividad_id', actividadIds)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateActividad(
    actividadId: string,
    estadoId: string,
    tecnicoNombre: string | null,
    observaciones: string | null,
    usuario: string,
    estadoAnteriorNombre: string,
    estadoNuevoNombre: string
  ): Promise<void> {
    // 1. Update activity
    const { error: actError } = await supabase
      .from('actividades')
      .update({
        estado_id: estadoId,
        tecnico_nombre: tecnicoNombre ? tecnicoNombre.trim() : null,
        observaciones: observaciones ? observaciones.trim() : null,
        fecha_estado: new Date().toISOString(),
        updated_by: usuario,
        updated_at: new Date().toISOString()
      })
      .eq('id', actividadId);
    if (actError) throw actError;

    // 2. Add history record
    const { error: histError } = await supabase
      .from('historial_despliegues')
      .insert({
        actividad_id: actividadId,
        usuario,
        accion: 'CAMBIO_ESTADO',
        estado_anterior: estadoAnteriorNombre,
        estado_nuevo: estadoNuevoNombre,
        observaciones: observaciones ? observaciones.trim() : null
      });
    if (histError) console.error('Error logging history:', histError);
  },

  async saveActividadMateriales(
    actividadId: string,
    materiales: { material_id: string; cantidad: number; origen: string | null }[]
  ): Promise<void> {
    // Delete existing materials for this activity first
    const { error: delError } = await supabase
      .from('actividad_materiales')
      .delete()
      .eq('actividad_id', actividadId);
    if (delError) throw delError;

    if (materiales.length > 0) {
      const inserts = materiales.map(m => ({
        actividad_id: actividadId,
        material_id: m.material_id,
        cantidad: m.cantidad,
        origen: m.origen
      }));
      const { error: insError } = await supabase
        .from('actividad_materiales')
        .insert(inserts);
      if (insError) throw insError;
    }
  },

  async addFoto(actividadId: string, url: string, usuario: string, estadoActual: string): Promise<void> {
    const { error: fotoError } = await supabase
      .from('fotos')
      .insert({
        actividad_id: actividadId,
        url,
        usuario,
        created_by: usuario,
        updated_by: usuario
      });
    if (fotoError) throw fotoError;

    // Log in history
    const { error: histError } = await supabase
      .from('historial_despliegues')
      .insert({
        actividad_id: actividadId,
        usuario,
        accion: 'SUBIO_FOTO',
        estado_anterior: estadoActual,
        estado_nuevo: estadoActual,
        observaciones: 'Subió una fotografía de evidencia'
      });
    if (histError) console.error('Error logging photo in history:', histError);
  },

  async deleteFoto(fotoId: string, actividadId: string, usuario: string, estadoActual: string): Promise<void> {
    const { error: delError } = await supabase
      .from('fotos')
      .delete()
      .eq('id', fotoId);
    if (delError) throw delError;

    // Log in history
    const { error: histError } = await supabase
      .from('historial_despliegues')
      .insert({
        actividad_id: actividadId,
        usuario,
        accion: 'ELIMINO_FOTO',
        estado_anterior: estadoActual,
        estado_nuevo: estadoActual,
        observaciones: 'Eliminó una fotografía de evidencia'
      });
    if (histError) console.error('Error logging photo deletion in history:', histError);
  },

  async logHistoryEvent(actividadId: string, usuario: string, accion: string, estado: string, observaciones: string): Promise<void> {
    const { error } = await supabase
      .from('historial_despliegues')
      .insert({
        actividad_id: actividadId,
        usuario,
        accion,
        estado_anterior: estado,
        estado_nuevo: estado,
        observaciones
      });
    if (error) console.error('Error logging generic history event:', error);
  },

  // File upload to Supabase Storage
  async uploadFoto(file: File, user: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${user}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('despliegues')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('despliegues')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  // 5. Global Search function
  async searchSigest(query: string): Promise<Sigest[]> {
    const term = query.trim();
    if (!term) return [];

    // Search by Sigest Number first
    const { data: sigByNumber, error: err1 } = await supabase
      .from('sigests')
      .select('*')
      .ilike('numero_sigest', `%${term}%`);
    if (err1) throw err1;

    // Search by Central
    const { data: sigByPol, error: err2 } = await supabase
      .from('sigests')
      .select('*')
      .ilike('central', `%${term}%`);
    if (err2) throw err2;

    // Search by CTO code or address
    const { data: ctos, error: err3 } = await supabase
      .from('ctos')
      .select('sigest_id')
      .or(`codigo.ilike.%${term}%,direccion.ilike.%${term}%`);
    if (err3) throw err3;

    const matchedSigestIds = new Set<string>();
    if (sigByNumber) sigByNumber.forEach(s => matchedSigestIds.add(s.id));
    if (sigByPol) sigByPol.forEach(s => matchedSigestIds.add(s.id));
    if (ctos) ctos.forEach(c => matchedSigestIds.add(c.sigest_id));

    if (matchedSigestIds.size === 0) return [];

    const { data: results, error: err4 } = await supabase
      .from('sigests')
      .select('*')
      .in('id', Array.from(matchedSigestIds))
      .order('numero_sigest', { ascending: true });
    if (err4) throw err4;

    return results || [];
  },

  async getDashboardStats(): Promise<{
    id: string;
    numero_sigest: string;
    central: string;
    total_ctos: number;
    instaladas: number;
    certificadas: number;
    progreso: number;
  }[]> {
    // 1. Fetch all SIGESTs
    const sigests = await this.getSigests();
    if (sigests.length === 0) return [];

    // 2. Fetch all CTOs
    const { data: ctos, error: ctosError } = await supabase
      .from('ctos')
      .select('id, sigest_id');
    if (ctosError) throw ctosError;

    // 3. Fetch all activities
    const { data: acts, error: actsError } = await supabase
      .from('actividades')
      .select(`
        cto_id,
        despliegues_estados ( nombre ),
        despliegues_tipos_actividad ( nombre )
      `);
    if (actsError) throw actsError;

    // Map CTO to its SIGEST ID
    const ctoToSigest: Record<string, string> = {};
    const statsMap: Record<string, { total_ctos: number; instaladas: number; certificadas: number }> = {};

    sigests.forEach(s => {
      statsMap[s.id] = { total_ctos: 0, instaladas: 0, certificadas: 0 };
    });

    ctos?.forEach(c => {
      ctoToSigest[c.id] = c.sigest_id;
      if (statsMap[c.sigest_id]) {
        statsMap[c.sigest_id].total_ctos++;
      }
    });

    acts?.forEach(act => {
      const sigestId = ctoToSigest[act.cto_id];
      if (!sigestId || !statsMap[sigestId]) return;

      const estNombre = (act.despliegues_estados as any)?.nombre?.toLowerCase();
      const tipoNombre = (act.despliegues_tipos_actividad as any)?.nombre?.toLowerCase();

      if (estNombre === 'completado') {
        if (tipoNombre?.includes('instalar')) {
          statsMap[sigestId].instaladas++;
        }
        if (tipoNombre?.includes('certificar')) {
          statsMap[sigestId].certificadas++;
        }
      }
    });

    return sigests.map(s => {
      const info = statsMap[s.id];
      const totalActivities = info.total_ctos * 2;
      const completedActivities = info.instaladas + info.certificadas;
      const progreso = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

      return {
        id: s.id,
        numero_sigest: s.numero_sigest,
        central: s.central,
        total_ctos: info.total_ctos,
        instaladas: info.instaladas,
        certificadas: info.certificadas,
        progreso
      };
    });
  }
};
