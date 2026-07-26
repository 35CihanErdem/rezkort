export type User = {
  id: string;
  firstName: string;
  lastName: string;
  /** Ana kimlik: 1 telefon = 1 hesap (farklı e-posta ile tekrar kayıt yok) */
  phone: string; // 10 hane, 5xxxxxxxxx
  /** E-posta doğrulaması sonrası telefona bağlanır */
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
};

export type Court = {
  id: string;
  name: string;
  district: string;
  address: string;
  openHour: number;
  closeHour: number;
};

export type Booking = {
  id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  hour: number;
  userId: string;
  phone: string;
  playerName: string;
  createdAt: string;
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
