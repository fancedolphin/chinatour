import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, Download, Navigation, Layers, DollarSign, GripVertical, MapPin, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';

interface MapPoint {
  id: string;
  name: string;
  type: 'attraction' | 'meal' | 'hotel';
  lat: number;
  lng: number;
  day: number;
  time: string;
  price?: string;
  order: number;
}

interface TripMapPageProps {
  tripId: string;
  onBack: () => void;
}

export function TripMapPage({ tripId, onBack }: TripMapPageProps) {
  const [selectedDay, setSelectedDay] = useState<number>(0); // 0 = all days
  const [budgetLevel, setBudgetLevel] = useState<string>('comfort');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Mock map points data
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([
    { id: '1', name: '大英博物馆', type: 'attraction', lat: 51.5194, lng: -0.1270, day: 1, time: '14:00', price: '免费', order: 1 },
    { id: '2', name: 'Dishoom餐厅', type: 'meal', lat: 51.5123, lng: -0.1240, day: 1, time: '12:00', price: '£25', order: 2 },
    { id: '3', name: '白金汉宫', type: 'attraction', lat: 51.5014, lng: -0.1419, day: 2, time: '10:00', price: '免费', order: 3 },
    { id: '4', name: '伦敦塔', type: 'attraction', lat: 51.5081, lng: -0.0759, day: 2, time: '15:00', price: '£33.60', order: 4 },
    { id: '5', name: 'Sketch餐厅', type: 'meal', lat: 51.5129, lng: -0.1410, day: 2, time: '12:30', price: '£42', order: 5 },
  ]);

  const days = [
    { value: 0, label: '全部行程' },
    { value: 1, label: 'Day 1 - 市中心初探' },
    { value: 2, label: 'Day 2 - 皇家巡礼' },
    { value: 3, label: 'Day 3 - 文化之旅' },
  ];

  const budgetLevels = [
    { value: 'economy', label: '经济型', desc: '< £10/天' },
    { value: 'comfort', label: '舒适型', desc: '£10-20/天' },
    { value: 'premium', label: '优享型', desc: '£20-50/天' },
    { value: 'luxury', label: '豪华型', desc: '£50+/天' },
  ];

  // Filter points by selected day
  const filteredPoints = selectedDay === 0 
    ? mapPoints 
    : mapPoints.filter(p => p.day === selectedDay);

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, pointId: string) => {
    setIsDragging(true);
    setDraggedItem(pointId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetPointId: string) => {
    e.preventDefault();
    setIsDragging(false);

    if (!draggedItem || draggedItem === targetPointId) {
      setDraggedItem(null);
      return;
    }

    // Reorder points
    const newPoints = [...mapPoints];
    const draggedIndex = newPoints.findIndex(p => p.id === draggedItem);
    const targetIndex = newPoints.findIndex(p => p.id === targetPointId);

    const [removed] = newPoints.splice(draggedIndex, 1);
    newPoints.splice(targetIndex, 0, removed);

    // Update order
    newPoints.forEach((point, index) => {
      point.order = index;
    });

    setMapPoints(newPoints);
    setDraggedItem(null);

    // Simulate recalculation
    setIsRecalculating(true);
    toast.info('正在重新计算路线...');
    setTimeout(() => {
      setIsRecalculating(false);
      toast.success('路线已更新！');
    }, 3000);
  };

  // Handle budget change
  const handleBudgetChange = (value: string) => {
    setBudgetLevel(value);
    toast.info('正在根据新预算重新计算推荐...');
    
    // Simulate recalculation with new budget
    setTimeout(() => {
      // Mock: adjust prices based on budget level
      const newPoints = mapPoints.map(point => {
        if (point.type === 'meal') {
          switch (value) {
            case 'economy':
              return { ...point, price: '£10-15' };
            case 'comfort':
              return { ...point, price: '£20-30' };
            case 'premium':
              return { ...point, price: '£40-60' };
            case 'luxury':
              return { ...point, price: '£80+' };
            default:
              return point;
          }
        }
        return point;
      });
      setMapPoints(newPoints);
      toast.success('推荐已更新！');
    }, 2000);
  };

  // Handle offline save
  const handleOfflineSave = () => {
    toast.info('正在缓存地图数据...');
    setTimeout(() => {
      toast.success('离线数据已保存！可以在无网络环境下查看行程。');
    }, 1500);
  };

  // Handle export as image
  const handleExportImage = () => {
    toast.info('正在生成行程地图图片...');
    setTimeout(() => {
      // Mock image export
      const link = document.createElement('a');
      link.download = 'trip-map.png';
      toast.success('地图图片已下载！');
    }, 2000);
  };

  // Handle navigation
  const handleNavigate = (point: MapPoint) => {
    const isChina = false; // Detect user location or preference
    const encodedName = encodeURIComponent(point.name);
    
    if (isChina) {
      // Gaode Maps (高德地图)
      window.open(`https://uri.amap.com/marker?position=${point.lng},${point.lat}&name=${encodedName}&src=myapp&coordinate=gaode&callnative=1`);
    } else {
      // Google Maps
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=transit`);
    }
  };

  const getPointColor = (type: string) => {
    switch (type) {
      case 'attraction':
        return 'bg-blue-500';
      case 'meal':
        return 'bg-orange-500';
      case 'hotel':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPointIcon = (type: string) => {
    switch (type) {
      case 'attraction':
        return '📸';
      case 'meal':
        return '🍽️';
      case 'hotel':
        return '🏨';
      default:
        return '📍';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-1">
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-gray-900">行程地图</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Day Selector */}
              <Select value={selectedDay.toString()} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* More Options */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Layers className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh]">
                  <SheetHeader>
                    <SheetTitle>地图选项</SheetTitle>
                  </SheetHeader>
                  
                  <div className="space-y-6 mt-6">
                    {/* Budget Level */}
                    <div>
                      <Label className="mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        预算档位
                      </Label>
                      <RadioGroup value={budgetLevel} onValueChange={handleBudgetChange}>
                        <div className="space-y-3">
                          {budgetLevels.map((level) => (
                            <div key={level.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={level.value} id={level.value} />
                              <Label htmlFor={level.value} className="flex-1 cursor-pointer">
                                <div>{level.label}</div>
                                <div className="text-xs text-gray-500">{level.desc}</div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Offline Save */}
                    <div>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={handleOfflineSave}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        离线保存（缓存地图数据）
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        将下载轻量地图瓦片，支持无网络查看
                      </p>
                    </div>

                    {/* Export Image */}
                    <div>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={handleExportImage}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        导出为图片
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        生成行程地图静态图片
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container (Mock) */}
      <div 
        ref={mapContainerRef}
        className="relative flex-1 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50"
      >
        {/* Mock Map with Points */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <MapPin className="w-16 h-16 text-red-500 mx-auto" />
            <div className="text-gray-600">
              <p className="mb-2">地图视图 (集成地图服务)</p>
              <p className="text-sm text-gray-400">
                显示 {filteredPoints.length} 个点位
                {selectedDay > 0 && ` · Day ${selectedDay}`}
              </p>
            </div>
            {isRecalculating && (
              <Badge variant="outline" className="border-blue-500 text-blue-500 animate-pulse">
                正在重新计算路线...
              </Badge>
            )}
          </div>
        </div>

        {/* Mock route line overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <path
            d="M 100 200 Q 300 100 500 300 T 900 400"
            stroke="#ef4444"
            strokeWidth="3"
            fill="none"
            strokeDasharray="10 5"
          />
        </svg>
      </div>

      {/* Bottom Sheet - Points List */}
      <div className="bg-white border-t border-gray-200 max-h-[40vh] overflow-y-auto">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">
              {selectedDay === 0 ? '全部点位' : `Day ${selectedDay} 点位`}
            </h3>
            <Badge variant="outline">
              {filteredPoints.length} 个地点
            </Badge>
          </div>

          <div className="space-y-2">
            {filteredPoints.map((point, index) => (
              <div
                key={point.id}
                draggable
                onDragStart={(e) => handleDragStart(e, point.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, point.id)}
                className={`bg-gray-50 rounded-xl p-3 flex items-center gap-3 cursor-move hover:bg-gray-100 transition-colors ${
                  draggedItem === point.id ? 'opacity-50' : ''
                }`}
              >
                {/* Drag Handle */}
                <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />

                {/* Order Number */}
                <div className={`w-8 h-8 ${getPointColor(point.type)} rounded-full flex items-center justify-center text-white flex-shrink-0`}>
                  {index + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getPointIcon(point.type)}</span>
                    <span className="text-gray-900 truncate">{point.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {point.time}
                    </span>
                    {point.price && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {point.price}
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      Day {point.day}
                    </Badge>
                  </div>
                </div>

                {/* Navigate Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleNavigate(point)}
                  className="flex-shrink-0"
                >
                  <Navigation className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {filteredPoints.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="w-12 h-12 mx-auto mb-2" />
              <p>该天暂无点位</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
