import { X, MapPin, Clock, DollarSign, Camera, Info, Ticket } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface AttractionDetail {
  name: string;
  nameEn: string;
  address: string;
  hours: string;
  ticketPrice: string;
  description: string;
  highlights: string[];
  tips: string[];
  images: string[];
  estimatedDuration: string;
}

interface AttractionDetailCardProps {
  attraction: AttractionDetail;
  onClose: () => void;
}

export function AttractionDetailCard({ attraction, onClose }: AttractionDetailCardProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Camera className="w-5 h-5 text-red-500" />
              <h2 className="text-gray-900">{attraction.name}</h2>
            </div>
            <p className="text-sm text-gray-500">{attraction.nameEn}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {/* Images Gallery */}
            {attraction.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {attraction.images.slice(0, 4).map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${attraction.name} ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(image, '_blank')}
                  />
                ))}
              </div>
            )}

            {/* Basic Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">地址</p>
                  <p className="text-sm text-gray-700">{attraction.address}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">开放时间</p>
                  <p className="text-sm text-gray-700">{attraction.hours}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Ticket className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">门票价格</p>
                  <p className="text-sm text-gray-700">{attraction.ticketPrice}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 mb-1">建议游览时长</p>
                  <p className="text-sm text-gray-700">{attraction.estimatedDuration}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-red-500" />
                <span>景点介绍</span>
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{attraction.description}</p>
            </div>

            <Separator />

            {/* Highlights */}
            <div>
              <h3 className="text-gray-900 mb-3">✨ 游览亮点</h3>
              <div className="space-y-2">
                {attraction.highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-3 bg-red-50 rounded-lg p-3">
                    <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shrink-0 text-xs">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700 flex-1">{highlight}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tips */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="text-gray-900 mb-3">💡 游览贴士</h3>
              <ul className="space-y-2">
                {attraction.tips.map((tip, index) => (
                  <li key={index} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-blue-500">•</span>
                    <span className="flex-1">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Booking Info */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h4 className="text-sm text-gray-900 mb-2 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-green-600" />
                <span>购票信息</span>
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                建议提前在线购票，避免现场排队。支持支付宝、微信等多种支付方式。
              </p>
              <div className="flex gap-2">
                <Badge className="bg-green-600">官网购票</Badge>
                <Badge className="bg-blue-600">携程/美团</Badge>
                <Badge className="bg-purple-600">飞猪旅行</Badge>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(attraction.address)}`, '_blank')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            导航前往
          </Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600"
            onClick={onClose}
          >
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
