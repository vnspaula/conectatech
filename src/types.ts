export interface UserProfile {
  id: number;
  uid: string;
  name: string;
  email: string;
  avatar?: string;
  city?: string;
  state?: string;
  bio?: string;
  interests?: string[];
  role?: string;
}

export interface Speaker {
  name: string;
  role: string;
  company: string;
  avatar: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
  description: string;
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  banner: string;
  date: string;
  time: string;
  city: string;
  state: string;
  address: string;
  modality: 'Online' | 'Presencial';
  priceType: 'Gratuito' | 'Pago';
  price?: string;
  capacity: number;
  enrolledCount: number;
  organizerName: string;
  category: string;
  rating: string;
  speakers?: Speaker[];
  schedule?: ScheduleItem[];
}

export interface ReviewItem {
  id: number;
  userId: number;
  eventId: number;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
  userAvatar: string;
}
