import { Calendar, DollarSign, MapPin, Plane, QrCode, Sparkles, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { formatTripDateRange } from '@/utils/tripShare';

interface ShareStyleTrip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget?: string;
  image: string;
  highlights?: string[];
  days?: number;
  qrCodeDataUrl?: string | null;
}

interface TripShareCardStylesProps {
  trip: ShareStyleTrip;
  style: 'modern' | 'minimal' | 'instagram' | 'story';
}

function getDateLabel(trip: ShareStyleTrip) {
  return formatTripDateRange(trip.startDate, trip.endDate, 'en-US');
}

function getHighlightList(trip: ShareStyleTrip, limit = 3) {
  return (trip.highlights ?? []).filter(Boolean).slice(0, limit);
}

function renderQrBlock(trip: ShareStyleTrip, theme: 'light' | 'dark' = 'light') {
  if (!trip.qrCodeDataUrl) {
    return null;
  }

  const frameClass = theme === 'dark'
    ? 'border-white/20 bg-white/10'
    : 'border-gray-200 bg-white';

  return (
    <div className={`rounded-2xl border p-2 ${frameClass}`}>
      <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-inherit opacity-70">
        <QrCode className="h-3 w-3" />
        Scan
      </div>
      <img src={trip.qrCodeDataUrl} alt={`${trip.destination} QR`} className="h-20 w-20 rounded-xl bg-white object-cover" />
    </div>
  );
}

export function TripShareCardStyles({ trip, style }: TripShareCardStylesProps) {
  const dateLabel = getDateLabel(trip);
  const highlights = getHighlightList(trip);

  if (style === 'modern') {
    return (
      <div className="w-[600px] overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative h-80">
          <ImageWithFallback src={trip.image} alt={trip.destination} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

          <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-6">
            <div className="rounded-full bg-white/90 px-4 py-2 text-sm text-gray-900 shadow-sm">
              {dateLabel}
            </div>
            {renderQrBlock(trip)}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="mb-3 flex items-center gap-3 text-white/90">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm uppercase tracking-[0.22em]">Chinaview Export</span>
            </div>
            <h1 className="mb-3 text-4xl tracking-tight text-white">{trip.destination}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
              <span className="flex items-center gap-1"><Plane className="h-4 w-4" />{trip.days || 1} Days</span>
              {trip.budget && <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{trip.budget}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.2fr_0.8fr] gap-6 p-8">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gray-500">
              <Star className="h-4 w-4 text-amber-500" />
              Highlights
            </div>
            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div key={`${highlight}-${index}`} className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-500 text-xs text-white">
                    {index + 1}
                  </span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-orange-50 to-rose-50 p-5">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-gray-500">Trip Snapshot</div>
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-red-500" />
                <span>{dateLabel}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
                <span>{trip.destination}</span>
              </div>
              <div className="flex items-start gap-3">
                <Plane className="mt-0.5 h-4 w-4 text-red-500" />
                <span>{trip.days || 1} day journey</span>
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

  if (style === 'minimal') {
    return (
      <div className="w-[600px] bg-white shadow-2xl">
        <div className="relative h-96">
          <ImageWithFallback src={trip.image} alt={trip.destination} className="h-full w-full object-cover" />
          <div className="absolute right-6 top-6">{renderQrBlock(trip)}</div>
        </div>

        <div className="space-y-8 p-12">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Travel Export</div>
            <h1 className="text-5xl tracking-tight text-gray-900">{trip.destination}</h1>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                Dates
              </div>
              <div className="text-sm text-gray-900">{dateLabel}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <Plane className="h-4 w-4" />
                Duration
              </div>
              <div className="text-sm text-gray-900">{trip.days || 1} Days</div>
            </div>
            {trip.budget && (
              <div className="rounded-2xl bg-gray-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                  <DollarSign className="h-4 w-4" />
                  Budget
                </div>
                <div className="text-sm text-gray-900">{trip.budget}</div>
              </div>
            )}
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                Destination
              </div>
              <div className="text-sm text-gray-900">{trip.destination}</div>
            </div>
          </div>

          <div>
            <div className="mb-4 text-sm uppercase tracking-[0.22em] text-gray-400">Highlights</div>
            <div className="space-y-3">
              {highlights.map((highlight, index) => (
                <div key={`${highlight}-${index}`} className="flex items-start gap-3 border-t border-gray-100 pt-3 text-sm text-gray-700 first:border-t-0 first:pt-0">
                  <span className="text-gray-400">{index + 1}.</span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === 'instagram') {
    return (
      <div className="flex h-[600px] w-[600px] flex-col overflow-hidden bg-white shadow-2xl">
        <div className="relative flex-1">
          <ImageWithFallback src={trip.image} alt={trip.destination} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          <div className="absolute left-5 right-5 top-5 flex items-start justify-between">
            <div className="rounded-full bg-white/90 px-3 py-1 text-xs text-gray-900">{dateLabel}</div>
            {renderQrBlock(trip)}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="mb-2 text-xs uppercase tracking-[0.24em] text-white/70">Exported Itinerary</div>
            <h1 className="mb-3 text-3xl">{trip.destination}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-white/90">
              <span>{trip.days || 1} days</span>
              {trip.budget && <span>• {trip.budget}</span>}
            </div>
            <div className="space-y-2 text-sm text-white/95">
              {highlights.slice(0, 2).map((highlight, index) => (
                <div key={`${highlight}-${index}`} className="flex items-start gap-2">
                  <Star className="mt-0.5 h-4 w-4 text-yellow-300" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-5 py-4 text-xs uppercase tracking-[0.24em] text-gray-500">
          <span>Chinaview</span>
          <span>Travel Planner</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[667px] w-[375px] overflow-hidden bg-black shadow-2xl">
      <ImageWithFallback src={trip.image} alt={trip.destination} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/85" />

      <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-6">
        <div className="flex items-center gap-3 rounded-full bg-black/25 px-4 py-2 text-white/90 backdrop-blur-md">
          <Plane className="h-4 w-4" />
          <span className="text-xs uppercase tracking-[0.24em]">Story Export</span>
        </div>
        {renderQrBlock(trip, 'dark')}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="rounded-[28px] border border-white/20 bg-white/12 p-6 text-white backdrop-blur-xl">
          <div className="mb-3 text-xs uppercase tracking-[0.24em] text-white/70">{dateLabel}</div>
          <h1 className="mb-4 text-3xl">{trip.destination}</h1>

          <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-white/90">
            <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{trip.days || 1} days</span>
            {trip.budget && <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" />{trip.budget}</span>}
          </div>

          <div className="space-y-2 text-sm text-white/90">
            {highlights.slice(0, 2).map((highlight, index) => (
              <div key={`${highlight}-${index}`} className="flex items-start gap-2">
                <Star className="mt-0.5 h-4 w-4 text-yellow-300" />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
