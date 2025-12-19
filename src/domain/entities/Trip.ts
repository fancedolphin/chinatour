/**
 * Domain Layer - Trip Entity
 * 核心业务实体，包含行程的业务规则和不变量
 */

export interface TripEntity {
  id: string;
  title: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  coverImage: string;
  status: TripStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  
  // 行程详情
  days?: TripDay[];
  budget?: Budget;
  travelers?: number;
  tags?: string[];
  
  // 业务方法
  isActive(): boolean;
  isCompleted(): boolean;
  canBeShared(): boolean;
  getDuration(): number;
}

export enum TripStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  CONFIRMED = 'confirmed',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface TripDay {
  day: number;
  date: Date;
  activities: Activity[];
  meals?: Meal[];
  accommodation?: Accommodation;
}

export interface Activity {
  id: string;
  time: string;
  title: string;
  description: string;
  location: Location;
  duration: number; // in minutes
  cost?: number;
  category: ActivityCategory;
  tags?: string[];
}

export enum ActivityCategory {
  SIGHTSEEING = 'sightseeing',
  FOOD = 'food',
  SHOPPING = 'shopping',
  ENTERTAINMENT = 'entertainment',
  TRANSPORTATION = 'transportation',
  ACCOMMODATION = 'accommodation',
  OTHER = 'other'
}

export interface Location {
  name: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  placeId?: string;
}

export interface Meal {
  time: 'breakfast' | 'lunch' | 'dinner';
  restaurant?: string;
  cost?: number;
  cuisine?: string;
}

export interface Accommodation {
  name: string;
  type: 'hotel' | 'hostel' | 'airbnb' | 'other';
  checkIn: Date;
  checkOut: Date;
  cost?: number;
  address?: string;
}

export interface Budget {
  total: number;
  currency: string;
  breakdown?: {
    accommodation?: number;
    food?: number;
    transportation?: number;
    activities?: number;
    other?: number;
  };
  spent?: number;
}

/**
 * Trip Entity 实现
 */
export class Trip implements TripEntity {
  constructor(
    public id: string,
    public title: string,
    public destination: string,
    public startDate: Date,
    public endDate: Date,
    public coverImage: string,
    public status: TripStatus,
    public createdBy: string,
    public createdAt: Date,
    public updatedAt: Date,
    public days?: TripDay[],
    public budget?: Budget,
    public travelers?: number,
    public tags?: string[]
  ) {}

  isActive(): boolean {
    const now = new Date();
    return this.status === TripStatus.ONGOING ||
           (this.status === TripStatus.CONFIRMED && this.startDate <= now && this.endDate >= now);
  }

  isCompleted(): boolean {
    return this.status === TripStatus.COMPLETED || 
           (this.endDate < new Date() && this.status !== TripStatus.CANCELLED);
  }

  canBeShared(): boolean {
    return this.status !== TripStatus.DRAFT && 
           this.status !== TripStatus.CANCELLED &&
           this.days !== undefined &&
           this.days.length > 0;
  }

  getDuration(): number {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 业务规则：验证行程是否有效
   */
  static validate(trip: Partial<TripEntity>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!trip.title || trip.title.trim().length === 0) {
      errors.push('Trip title is required');
    }

    if (!trip.destination || trip.destination.trim().length === 0) {
      errors.push('Destination is required');
    }

    if (!trip.startDate) {
      errors.push('Start date is required');
    }

    if (!trip.endDate) {
      errors.push('End date is required');
    }

    if (trip.startDate && trip.endDate && trip.startDate > trip.endDate) {
      errors.push('End date must be after start date');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 工厂方法：创建新行程
   */
  static create(data: {
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
    userId: string;
    coverImage?: string;
  }): Trip {
    const validation = Trip.validate(data);
    if (!validation.valid) {
      throw new Error(`Invalid trip data: ${validation.errors.join(', ')}`);
    }

    return new Trip(
      crypto.randomUUID(),
      data.title,
      data.destination,
      data.startDate,
      data.endDate,
      data.coverImage || '',
      TripStatus.DRAFT,
      data.userId,
      new Date(),
      new Date()
    );
  }
}
