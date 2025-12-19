import { ChevronRight } from 'lucide-react';

interface MealItemProps {
  mealType: string;
  mealInfo: string;
  onClick: () => void;
}

export function MealItem({ mealType, mealInfo, onClick }: MealItemProps) {
  // Extract restaurant name from mealInfo (format: "Restaurant - description, price")
  const restaurantName = mealInfo.split(' - ')[0];
  
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2 w-full text-left group hover:bg-red-50 active:bg-red-100 rounded-lg p-2 -ml-2 transition-all active:scale-[0.98] active:opacity-90"
    >
      <span className="text-xs text-gray-500 shrink-0">{mealType}：</span>
      <div className="flex-1 flex items-center gap-1">
        <span className="text-xs text-gray-700 group-hover:text-red-600 transition-colors">{mealInfo}</span>
        <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </button>
  );
}
