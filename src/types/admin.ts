export type Municipality = {
  id: string;
  name: string;
  createdAt: string;
};

export type Facility = {
  id: string;
  municipalityId: string;
  name: string;
  district: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminCourt = {
  id: string;
  facilityId: string;
  name: string;
  surfaceType: 'hard' | 'clay' | 'acrylic';
  hasLights: boolean;
  status: 'active' | 'maintenance' | 'inactive';
  openHour: number;
  closeHour: number;
  facilityName?: string;
  district?: string;
  municipalityName?: string;
};

export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; reason: string };

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  role: 'citizen' | 'staff' | 'admin' | 'super_admin';
  isActive: boolean;
  createdAt: string;
};

export type ReservationRules = {
  id: string;
  municipalityId: string;
  municipalityName?: string;
  maxActiveReservations: number;
  maxDaysAhead: number;
  cancelBeforeMinutes: number;
  noShowLimit: number;
  banDays: number;
  /** Slot başladıktan sonra kaç dk geç rezervasyon / giriş (tek tolerans) */
  lateJoinMinutes: number;
  updatedAt: string;
};
