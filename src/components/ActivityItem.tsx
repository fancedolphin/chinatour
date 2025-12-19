import { Train, Camera, Home, ChevronRight } from 'lucide-react';

interface Activity {
  time: string;
  name: string;
  description: string;
  type: 'attraction' | 'transport' | 'rest';
}

interface ActivityItemProps {
  activity: Activity;
  onClick: () => void;
}

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const getIcon = () => {
    switch (activity.type) {
      case 'transport':
        return <Train className="w-3 h-3" />;
      case 'attraction':
        return <Camera className="w-3 h-3" />;
      case 'rest':
        return <Home className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getIconColor = () => {
    switch (activity.type) {
      case 'transport':
        return 'bg-purple-100 text-purple-600';
      case 'attraction':
        return 'bg-blue-100 text-blue-600';
      case 'rest':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Only make transport and attraction clickable
  const isClickable = activity.type === 'transport' || activity.type === 'attraction';

  if (!isClickable) {
    return (
      <div className="flex gap-3">
        <div className="text-xs text-gray-500 w-12 shrink-0 pt-0.5">
          {activity.time}
        </div>
        <div className="flex-1 flex items-start gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${getIconColor()}`}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-900">{activity.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex gap-3 w-full text-left group hover:bg-red-50 active:bg-red-100 rounded-lg p-2 -m-2 transition-all active:scale-[0.98] active:opacity-90"
    >
      <div className="text-xs text-gray-500 w-12 shrink-0 pt-0.5">
        {activity.time}
      </div>
      <div className="flex-1 flex items-start gap-2">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${getIconColor()} group-hover:scale-110 transition-transform`}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <p className="text-sm text-gray-900 group-hover:text-red-600 transition-colors">{activity.name}</p>
            <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
        </div>
      </div>
    </button>
  );
}
