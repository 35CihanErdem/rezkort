export type User = {
  id: string;
  firstName: string;
  lastName: string;
  /** Ana kimlik: 1 telefon = 1 hesap (farklı e-posta ile tekrar kayıt yok) */
  phone: string; // E.164: +905xxxxxxxxx
  /** E-posta doğrulaması sonrası telefona bağlanır */
  email: string;
  username: string;
  role: 'citizen' | 'staff' | 'admin' | 'super_admin';
  phoneVerified: boolean;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Court = {
  id: string;
  facilityId?: string;
  name: string;
  district: string;
  address: string;
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
  Otp: undefined;
  SetPassword: undefined;
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
