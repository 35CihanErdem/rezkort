export type Court = {
  id: string;
  facilityId?: string;
  municipalityId?: string;
  name: string;
  district: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  municipalityName?: string;
  surfaceType?: 'hard' | 'clay' | 'acrylic';
  hasLights?: boolean;
  status?: 'active' | 'maintenance' | 'inactive';
  openHour: number;
  closeHour: number;
};

export type Booking = {
  id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  endHour: number;
  status: 'active' | 'cancelled' | 'cancelled_late' | 'completed' | 'no_show';
  reservationSource: 'mobile' | 'admin' | 'staff' | 'qr';
  checkedIn: boolean;
  userId: string;
  phone: string;
  playerName: string;
  notes?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  CourtDetail: { courtId: string };
};

export type MainTabParamList = {
  Courts: undefined;
  MyBookings: undefined;
  Account: undefined;
  Admin: undefined;
};

/** @deprecated Profile tipi src/types/profile.ts içinde */
export type { Profile as User } from './types/profile';
