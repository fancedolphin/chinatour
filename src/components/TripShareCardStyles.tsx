import { MapPin, Calendar, DollarSign, Star, Sparkles, Plane, Heart } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface TripShareCardStylesProps {
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
  style: 'modern' | 'minimal' | 'instagram' | 'story';
}

export function TripShareCardStyles({ trip, style }: TripShareCardStylesProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Modern Style - Default
  if (style === 'modern') {
    return (
      <div className="w-[600px] bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative h-80">
          <ImageWithFallback
            src={trip.image}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
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
              <span className="text-sm">{trip.days || 5} Days Journey</span>
            </div>
          </div>

          <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2">
            <span className="text-sm text-gray-900">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
          </div>
        </div>

        <div className="p-8">
          {trip.highlights && trip.highlights.length > 0 && (
            <div className="space-y-2">
              {trip.highlights.slice(0, 3).map((highlight, index) => (
                <div key={index} className="flex items-start gap-3 text-gray-700 text-sm">
                  <span className="w-6 h-6 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Minimal Style - Clean and simple
  if (style === 'minimal') {
    return (
      <div className="w-[600px] bg-white shadow-2xl">
        <div className="relative h-96">
          <ImageWithFallback
            src={trip.image}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="p-12">
          <h1 className="text-gray-900 text-5xl mb-6 tracking-tight">
            {trip.destination}
          </h1>
          
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Plane className="w-5 h-5" />
              <span>{trip.days || 5} Days</span>
            </div>
            {trip.budget && (
              <div className="flex items-center gap-3 text-gray-600">
                <DollarSign className="w-5 h-5" />
                <span>{trip.budget}</span>
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-gray-200">
            <p className="text-gray-500 text-sm">smarttravel.ai</p>
          </div>
        </div>
      </div>
    );
  }

  // Instagram Post Style - Square format
  if (style === 'instagram') {
    return (
      <div className="w-[600px] h-[600px] bg-white shadow-2xl flex flex-col">
        <div className="relative flex-1">
          <ImageWithFallback
            src={trip.image}
            alt={trip.destination}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="text-white text-3xl mb-2">
              {trip.destination}
            </h1>
            <div className="flex items-center gap-4 text-white/90 text-sm">
              <span>{formatDate(trip.startDate)}</span>
              <span>•</span>
              <span>{trip.days} days</span>
              {trip.budget && (
                <>
                  <span>•</span>
                  <span>{trip.budget}</span>
                </>
              )}
            </div>
          </div>

          <div className="absolute top-4 right-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-900">Travel</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white">
          <p className="text-xs text-gray-500">
            ✈️ Planned with Smart Travel AI • smarttravel.ai
          </p>
        </div>
      </div>
    );
  }

  // Instagram Story Style - Vertical format
  if (style === 'story') {
    return (
      <div className="w-[375px] h-[667px] bg-black shadow-2xl relative overflow-hidden">
        <ImageWithFallback
          src={trip.image}
          alt={trip.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

        {/* Top */}
        <div className="absolute top-0 left-0 right-0 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm">Smart Travel</p>
              <p className="text-white/70 text-xs">{formatDate(trip.startDate)}</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20">
            <h1 className="text-white text-3xl mb-3">
              {trip.destination}
            </h1>
            
            <div className="flex items-center gap-4 text-white/90 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{trip.days} days</span>
              </div>
              {trip.budget && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>{trip.budget}</span>
                </div>
              )}
            </div>

            {trip.highlights && trip.highlights.length > 0 && (
              <div className="space-y-2 mb-4">
                {trip.highlights.slice(0, 2).map((highlight, index) => (
                  <div key={index} className="flex items-center gap-2 text-white/90 text-sm">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center pt-4 border-t border-white/20">
              <p className="text-white/70 text-xs">Swipe up to plan your trip</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
