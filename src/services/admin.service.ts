import { supabase } from '../lib/supabase';
import type {
  AdminActionResult,
  AdminCourt,
  AdminUser,
  Facility,
  Municipality,
} from '../types/admin';
import type { ProfileRole } from '../types/profile';

type MunicipalityRow = {
  id: string;
  name: string;
  created_at: string;
};

type FacilityRow = {
  id: string;
  municipality_id: string;
  name: string;
  district: string;
  address: string;
  created_at: string;
  updated_at: string;
};

type CourtRow = {
  id: string;
  facility_id: string;
  name: string;
  surface_type: AdminCourt['surfaceType'];
  has_lights: boolean;
  status: AdminCourt['status'];
  open_hour: number;
  close_hour: number;
  facilities?:
    | {
        name: string;
        district: string;
        municipalities?: { name: string } | { name: string }[] | null;
      }
    | {
        name: string;
        district: string;
        municipalities?: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function mapMunicipality(row: MunicipalityRow): Municipality {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function mapFacility(row: FacilityRow): Facility {
  return {
    id: row.id,
    municipalityId: row.municipality_id,
    name: row.name,
    district: row.district,
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function unwrapFacility(
  facilities: CourtRow['facilities'],
): {
  name?: string;
  district?: string;
  municipalityName?: string;
} {
  const facility = Array.isArray(facilities) ? facilities[0] : facilities;
  if (!facility) return {};
  const municipality = Array.isArray(facility.municipalities)
    ? facility.municipalities[0]
    : facility.municipalities;
  return {
    name: facility.name,
    district: facility.district,
    municipalityName: municipality?.name,
  };
}

function mapAdminCourt(row: CourtRow): AdminCourt {
  const facility = unwrapFacility(row.facilities);
  return {
    id: row.id,
    facilityId: row.facility_id,
    name: row.name,
    surfaceType: row.surface_type,
    hasLights: row.has_lights,
    status: row.status,
    openHour: row.open_hour,
    closeHour: row.close_hour,
    facilityName: facility.name,
    district: facility.district,
    municipalityName: facility.municipalityName,
  };
}

export async function listMunicipalities(): Promise<Municipality[]> {
  const { data, error } = await supabase
    .from('municipalities')
    .select('id,name,created_at')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as MunicipalityRow[] | null)?.map(mapMunicipality) ?? [];
}

export async function listFacilities(
  municipalityId?: string,
): Promise<Facility[]> {
  let query = supabase
    .from('facilities')
    .select('id,municipality_id,name,district,address,created_at,updated_at')
    .order('name', { ascending: true });

  if (municipalityId) {
    query = query.eq('municipality_id', municipalityId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as FacilityRow[] | null)?.map(mapFacility) ?? [];
}

export async function listAdminCourts(
  facilityId?: string,
): Promise<AdminCourt[]> {
  let query = supabase
    .from('courts')
    .select(
      'id,facility_id,name,surface_type,has_lights,status,open_hour,close_hour,facilities(name,district,municipalities(name))',
    )
    .order('name', { ascending: true });

  if (facilityId) {
    query = query.eq('facility_id', facilityId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return ((data as unknown as CourtRow[] | null) ?? []).map(mapAdminCourt);
}

export async function createFacility(input: {
  municipalityId: string;
  name: string;
  district: string;
  address: string;
}): Promise<AdminActionResult & { facility?: Facility }> {
  const name = input.name.trim();
  const district = input.district.trim();
  const address = input.address.trim();

  if (!input.municipalityId) {
    return { ok: false, reason: 'Belediye seç.' };
  }
  if (!name || !district || !address) {
    return { ok: false, reason: 'Tesis adı, semt ve adres gerekli.' };
  }

  const { data, error } = await supabase
    .from('facilities')
    .insert({
      municipality_id: input.municipalityId,
      name,
      district,
      address,
    })
    .select('id,municipality_id,name,district,address,created_at,updated_at')
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, reason: 'Bu belediyede aynı tesis adı var.' };
    }
    return { ok: false, reason: error.message };
  }
  if (!data) return { ok: false, reason: 'Tesis oluşturulamadı.' };

  return {
    ok: true,
    message: 'Tesis eklendi.',
    facility: mapFacility(data as FacilityRow),
  };
}

export async function createCourt(input: {
  facilityId: string;
  name: string;
  surfaceType?: AdminCourt['surfaceType'];
  hasLights?: boolean;
  openHour: number;
  closeHour: number;
}): Promise<AdminActionResult & { court?: AdminCourt }> {
  const name = input.name.trim();
  if (!input.facilityId) return { ok: false, reason: 'Tesis seç.' };
  if (!name) return { ok: false, reason: 'Kort adı gerekli.' };
  if (
    !Number.isInteger(input.openHour) ||
    !Number.isInteger(input.closeHour) ||
    input.openHour < 0 ||
    input.closeHour > 24 ||
    input.openHour >= input.closeHour
  ) {
    return { ok: false, reason: 'Açılış/kapanış saatlerini kontrol et.' };
  }

  const { data, error } = await supabase
    .from('courts')
    .insert({
      facility_id: input.facilityId,
      name,
      surface_type: input.surfaceType ?? 'hard',
      has_lights: input.hasLights ?? false,
      reservation_duration: 60,
      status: 'active',
      open_hour: input.openHour,
      close_hour: input.closeHour,
    })
    .select(
      'id,facility_id,name,surface_type,has_lights,status,open_hour,close_hour,facilities(name,district,municipalities(name))',
    )
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, reason: 'Bu tesiste aynı kort adı var.' };
    }
    if (error.message.toLowerCase().includes('row-level security')) {
      return {
        ok: false,
        reason: 'Yetkin yok. Profil role admin/staff olmalı.',
      };
    }
    return { ok: false, reason: error.message };
  }
  if (!data) return { ok: false, reason: 'Kort oluşturulamadı.' };

  return {
    ok: true,
    message: 'Kort eklendi.',
    court: mapAdminCourt(data as unknown as CourtRow),
  };
}

export async function updateCourtStatus(
  courtId: string,
  status: AdminCourt['status'],
): Promise<AdminActionResult> {
  const { error } = await supabase
    .from('courts')
    .update({ status })
    .eq('id', courtId);

  if (error) {
    if (error.message.toLowerCase().includes('row-level security')) {
      return { ok: false, reason: 'Yetkin yok.' };
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true, message: 'Kort durumu güncellendi.' };
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id,first_name,last_name,username,email,phone,role,is_active,created_at',
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (
    (data as
      | {
          id: string;
          first_name: string;
          last_name: string;
          username: string | null;
          email: string;
          phone: string;
          role: ProfileRole;
          is_active: boolean;
          created_at: string;
        }[]
      | null) ?? []
  ).map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username ?? '',
    email: row.email,
    phone: row.phone,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function updateUserRole(
  userId: string,
  role: ProfileRole,
): Promise<AdminActionResult> {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  if (error) {
    if (error.message.toLowerCase().includes('row-level security')) {
      return { ok: false, reason: 'Yetkin yok (super_admin gerekir).' };
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true, message: 'Rol güncellendi.' };
}

type RulesRow = {
  id: string;
  municipality_id: string;
  max_active_reservations: number;
  max_days_ahead: number;
  cancel_before_minutes: number;
  no_show_limit: number;
  ban_days: number;
  late_join_minutes: number | null;
  updated_at: string;
  municipalities?: { name: string } | { name: string }[] | null;
};

function mapRules(row: RulesRow): import('../types/admin').ReservationRules {
  const muni = Array.isArray(row.municipalities)
    ? row.municipalities[0]
    : row.municipalities;
  return {
    id: row.id,
    municipalityId: row.municipality_id,
    municipalityName: muni?.name,
    maxActiveReservations: row.max_active_reservations,
    maxDaysAhead: row.max_days_ahead,
    cancelBeforeMinutes: row.cancel_before_minutes,
    noShowLimit: row.no_show_limit,
    banDays: row.ban_days,
    lateJoinMinutes: row.late_join_minutes ?? 30,
    updatedAt: row.updated_at,
  };
}

export async function listReservationRules(): Promise<
  import('../types/admin').ReservationRules[]
> {
  const { data, error } = await supabase
    .from('reservation_rules')
    .select(
      'id,municipality_id,max_active_reservations,max_days_ahead,cancel_before_minutes,no_show_limit,ban_days,late_join_minutes,updated_at,municipalities(name)',
    )
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data as unknown as RulesRow[] | null) ?? []).map(mapRules);
}

export async function updateReservationRules(
  municipalityId: string,
  patch: {
    lateJoinMinutes?: number;
    cancelBeforeMinutes?: number;
    maxDaysAhead?: number;
    maxActiveReservations?: number;
  },
): Promise<AdminActionResult> {
  const update: Record<string, number> = {};
  if (patch.lateJoinMinutes !== undefined) {
    update.late_join_minutes = Math.max(0, Math.floor(patch.lateJoinMinutes));
  }
  if (patch.cancelBeforeMinutes !== undefined) {
    update.cancel_before_minutes = Math.max(
      0,
      Math.floor(patch.cancelBeforeMinutes),
    );
  }
  if (patch.maxDaysAhead !== undefined) {
    update.max_days_ahead = Math.max(1, Math.floor(patch.maxDaysAhead));
  }
  if (patch.maxActiveReservations !== undefined) {
    update.max_active_reservations = Math.max(
      1,
      Math.floor(patch.maxActiveReservations),
    );
  }

  if (Object.keys(update).length === 0) {
    return { ok: false, reason: 'Güncellenecek alan yok.' };
  }

  const { error } = await supabase
    .from('reservation_rules')
    .update(update)
    .eq('municipality_id', municipalityId);

  if (error) {
    if (error.message.toLowerCase().includes('row-level security')) {
      return { ok: false, reason: 'Yetkin yok.' };
    }
    if (error.message.toLowerCase().includes('late_join_minutes')) {
      return {
        ok: false,
        reason:
          'Veritabanında late_join_minutes yok. 0012_late_join_tolerance.sql migration’ını çalıştır.',
      };
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true, message: 'Kurallar kaydedildi.' };
}
