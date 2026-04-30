import { MapPin, List, Compass, User, AlertCircle } from 'lucide-react';
import { useT } from '@/i18n/useT';

interface TripPlannerBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function TripPlannerBottomNav({ currentTab, onTabChange }: TripPlannerBottomNavProps) {
  const { t } = useT();

  const navItems = [
    { id: 'planner', icon: MapPin, label: t('nav.plan') },
    { id: 'trips', icon: List, label: t('nav.trips') },
    { id: 'tips', icon: AlertCircle, label: t('nav.tips') },
    { id: 'discover', icon: Compass, label: t('nav.explore') },
    { id: 'profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-screen-xl mx-auto flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              data-testid={`nav-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors"
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-red-500' : 'text-gray-600'}`} />
              <span className={`text-xs ${isActive ? 'text-red-500' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
