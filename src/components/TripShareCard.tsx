import { MapPin, Calendar, DollarSign, Star, Sparkles } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

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
  };
  showQR?: boolean;
}

export function TripShareCard({ trip, showQR = false }: TripShareCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="w-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl">
      {/* Header with Gradient Overlay */}
      <div className="relative h-80">
        <ImageWithFallback
          src={trip.image}
          alt={trip.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Destination Title */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/90 text-sm">AI Planned Trip</span>
          </div>
          <h1 className="text-white text-4xl mb-2 tracking-tight">
            {trip.destination}
          </h1>
          <div className="flex items-center gap-2 text-white/90">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Explore & Discover</span>
          </div>
        </div>

        {/* Corner Badge */}
        <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2">
          <span className="text-sm text-gray-900">{trip.days || 5} Days</span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-8">
        {/* Date & Budget */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">Dates</span>
            </div>
            <p className="text-gray-900 text-sm">
              {formatDate(trip.startDate)}
            </p>
            <p className="text-gray-900 text-sm">
              to {formatDate(trip.endDate)}
            </p>
          </div>

          {trip.budget && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Budget</span>
              </div>
              <p className="text-gray-900 text-lg">
                {trip.budget}
              </p>
            </div>
          )}
        </div>

        {/* Highlights */}
        {trip.highlights && trip.highlights.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-500" />
              <h3 className="text-gray-900 text-sm uppercase tracking-wide">Highlights</h3>
            </div>
            <div className="space-y-2">
              {trip.highlights.slice(0, 3).map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 text-gray-700 text-sm"
                >
                  <span className="w-6 h-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs mb-1">Planned with</p>
            <p className="text-gray-900 font-medium">Smart Travel AI</p>
          </div>

          {showQR && (
            <div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center">
              <span className="text-xs text-gray-500">QR Code</span>
            </div>
          )}

          {!showQR && (
            <div className="text-right">
              <p className="text-gray-500 text-xs mb-1">Join us at</p>
              <p className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500 font-medium">
                smarttravel.ai
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
