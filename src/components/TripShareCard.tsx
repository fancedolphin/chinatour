import { Calendar, DollarSign, MapPin, QrCode, Sparkles, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatTripDateRange } from '@/utils/tripShare';

interface TripShareCardProps {
  trip: {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    budget?: string;
    image: string;
    highlights?: string[];
    days?: number;
    qrCodeDataUrl?: string | null;
  };
  showQR?: boolean;
}

export function TripShareCard({ trip, showQR = false }: TripShareCardProps) {
  const dateLabel = formatTripDateRange(trip.startDate, trip.endDate, 'en-US');

  return (
    <div className="w-[600px] overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="relative h-80">
        <ImageWithFallback
          src={trip.image}
          alt={trip.destination}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute left-6 right-6 top-6 flex items-start justify-between">
          <div className="rounded-full bg-white/95 px-4 py-2 text-sm text-gray-900 shadow-sm">
            {dateLabel}
          </div>
          {showQR && trip.qrCodeDataUrl ? (
            <div className="rounded-2xl bg-white/95 p-2 shadow-sm">
              <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-gray-500">
                <QrCode className="h-3 w-3" />
                Scan
              </div>
              <img src={trip.qrCodeDataUrl} alt={`${trip.destination} QR`} className="h-20 w-20 rounded-xl bg-white object-cover" />
            </div>
          ) : null}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm text-white/90">AI Planned Trip</span>
          </div>
          <h1 className="mb-2 text-4xl tracking-tight text-white">
            {trip.destination}
          </h1>
          <div className="flex items-center gap-4 text-sm text-white/90">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {trip.days || 1} Days
            </span>
            {trip.budget && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {trip.budget}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-6 p-8">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm uppercase tracking-[0.18em] text-gray-500">Highlights</h3>
          </div>
          <div className="space-y-3">
            {(trip.highlights ?? []).slice(0, 3).map((highlight, index) => (
              <div
                key={`${highlight}-${index}`}
                className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700"
              >
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-500 text-xs text-white">
                  {index + 1}
                </span>
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-orange-50 to-rose-50 p-5">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-gray-500">Snapshot</div>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 text-red-500" />
              <span>{dateLabel}</span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
              <span>{trip.destination}</span>
            </div>
            {trip.budget && (
              <div className="flex items-start gap-3">
                <DollarSign className="mt-0.5 h-4 w-4 text-red-500" />
                <span>{trip.budget}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
