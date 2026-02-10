import { X, MapPin, Navigation } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface Location {
  name: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  day: number;
}

interface TripMapViewerProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Location[];
  destination: string;
}

export function TripMapViewer({ isOpen, onClose, locations, destination }: TripMapViewerProps) {
  if (!isOpen) return null;

  // Group locations by day
  const locationsByDay = locations.reduce((acc, loc) => {
    if (!acc[loc.day]) {
      acc[loc.day] = [];
    }
    acc[loc.day].push(loc);
    return acc;
  }, {} as Record<number, Location[]>);

  const days = Object.keys(locationsByDay).map(Number).sort((a, b) => a - b);

  // Generate Google Maps URL for directions
  const getGoogleMapsUrl = (loc: Location) => {
    return `https://www.google.com/maps/search/?api=1&query=${loc.coordinates.lat},${loc.coordinates.lng}`;
  };

  // Generate Google Maps URL for all locations in a day
  const getDayRouteUrl = (dayLocations: Location[]) => {
    if (dayLocations.length === 0) return '#';
    if (dayLocations.length === 1) {
      return getGoogleMapsUrl(dayLocations[0]);
    }
    
    const origin = dayLocations[0];
    const destination = dayLocations[dayLocations.length - 1];
    const waypoints = dayLocations.slice(1, -1);
    
    let url = `https://www.google.com/maps/dir/?api=1`;
    url += `&origin=${origin.coordinates.lat},${origin.coordinates.lng}`;
    url += `&destination=${destination.coordinates.lat},${destination.coordinates.lng}`;
    
    if (waypoints.length > 0) {
      const waypointStr = waypoints
        .map(w => `${w.coordinates.lat},${w.coordinates.lng}`)
        .join('|');
      url += `&waypoints=${encodeURIComponent(waypointStr)}`;
    }
    
    url += `&travelmode=transit`;
    return url;
  };

  // Day colors for visual distinction
  const dayColors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">行程地图</h2>
            <p className="text-sm text-gray-500">{destination} · {locations.length} 个地点</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map Placeholder - In production, integrate with Google Maps or Mapbox */}
          <div className="flex-1 bg-gray-100 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">地图视图</p>
                <p className="text-sm text-gray-400 mb-4">
                  点击右侧地点可在 Google Maps 中查看
                </p>
                {locations.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getDayRouteUrl(locations), '_blank')}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    在 Google Maps 中查看全部
                  </Button>
                )}
              </div>
            </div>
            
            {/* Mini map markers visualization */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
              <div className="flex items-center gap-2 flex-wrap">
                {days.map((day, idx) => (
                  <div key={day} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${dayColors[idx % dayColors.length]}`} />
                    <span className="text-xs text-gray-600">Day {day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Locations List */}
          <div className="w-80 border-l border-gray-200 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {days.map((day, dayIdx) => (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${dayColors[dayIdx % dayColors.length]} text-white text-xs flex items-center justify-center font-medium`}>
                          {day}
                        </div>
                        <span className="text-sm font-medium text-gray-700">第 {day} 天</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => window.open(getDayRouteUrl(locationsByDay[day]), '_blank')}
                      >
                        <Navigation className="w-3 h-3 mr-1" />
                        路线
                      </Button>
                    </div>
                    
                    <div className="space-y-2 ml-3 pl-3 border-l-2 border-gray-200">
                      {locationsByDay[day].map((loc, idx) => (
                        <button
                          key={idx}
                          onClick={() => window.open(getGoogleMapsUrl(loc), '_blank')}
                          className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded-full ${dayColors[dayIdx % dayColors.length]} text-white text-[10px] flex items-center justify-center font-medium shrink-0 mt-0.5`}>
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate group-hover:text-red-600 transition-colors">
                                {loc.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {loc.description}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {loc.coordinates.lat.toFixed(4)}, {loc.coordinates.lng.toFixed(4)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              💡 点击地点名称可在 Google Maps 中查看详情
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
