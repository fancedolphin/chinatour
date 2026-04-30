import { X, Train, Car, Clock, DollarSign, MapPin, Smartphone, CreditCard } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useT } from '@/i18n/useT';

interface SubwayOption {
  line: string;
  stations: string[];
  duration: string;
  price: string;
  ticketGuide: string[];
  alipayGuide: string[];
}

interface TaxiOption {
  estimatedPrice: string;
  duration: string;
  paymentMethods: string[];
  apps: {
    name: string;
    description: string;
    supportsAlipay: boolean;
  }[];
}

interface TransportDetail {
  from: string;
  to: string;
  subway?: SubwayOption;
  taxi?: TaxiOption;
}

interface TransportDetailCardProps {
  transport: TransportDetail;
  onClose: () => void;
}

export function TransportDetailCard({ transport, onClose }: TransportDetailCardProps) {
  const { t } = useT();
  const tips = t('transport.tips', { returnObjects: true }) as string[];
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-gray-900 mb-2">{t('transport.title')}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{transport.from}</span>
              <span className="text-gray-400">→</span>
              <span>{transport.to}</span>
            </div>
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
            {/* Subway Option */}
            {transport.subway && (
              <div className="bg-blue-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Train className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-gray-900">{t('transport.subway')}</h3>
                    <p className="text-xs text-gray-600">{t('transport.subwayBadge')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Route Info */}
                  <div className="bg-white rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-blue-500">{transport.subway.line}</Badge>
                      <span className="text-xs text-gray-500">
                        {t('transport.stationsCount', { count: transport.subway.stations.length })}
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{transport.subway.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{transport.subway.price}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Alipay Guide */}
                  <div>
                    <h4 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-green-500" />
                      <span>{t('transport.alipayBuy')}</span>
                    </h4>
                    <div className="bg-white rounded-lg p-4 space-y-2">
                      {transport.subway.alipayGuide.map((step, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center shrink-0 text-xs">
                            {index + 1}
                          </div>
                          <p className="text-sm text-gray-700 flex-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Traditional Ticket Guide */}
                  <div>
                    <h4 className="text-sm text-gray-900 mb-3">{t('transport.otherBuy')}</h4>
                    <div className="bg-white rounded-lg p-4 space-y-2">
                      {transport.subway.ticketGuide.map((guide, index) => (
                        <div key={index} className="flex gap-2 text-xs text-gray-600">
                          <span className="text-gray-400">•</span>
                          <span>{guide}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stations Preview */}
                  <div>
                    <h4 className="text-sm text-gray-900 mb-3">{t('transport.stations')}</h4>
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {transport.subway.stations.map((station, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <span className="text-xs text-gray-600">{station}</span>
                            {index < transport.subway.stations.length - 1 && (
                              <span className="text-gray-400">→</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Taxi Option */}
            {transport.taxi && (
              <>
                {transport.subway && <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-gray-50 px-4 text-xs text-gray-500">{t('transport.or')}</span>
                  </div>
                </div>}

                <div className="bg-amber-50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Car className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-gray-900">{t('transport.taxi')}</h3>
                      <p className="text-xs text-gray-600">{t('transport.taxiBadge')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Price Info */}
                    <div className="bg-white rounded-lg p-4">
                      <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{t('transport.estimatedPrice', { price: transport.taxi.estimatedPrice })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{transport.taxi.duration}</span>
                        </div>
                      </div>
                    </div>

                    {/* Apps */}
                    <div>
                      <h4 className="text-sm text-gray-900 mb-3">{t('transport.recommendedApps')}</h4>
                      <div className="space-y-2">
                        {transport.taxi.apps.map((app, index) => (
                          <div key={index} className="bg-white rounded-lg p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="text-sm text-gray-900">{app.name}</h5>
                                  {app.supportsAlipay && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                      <Smartphone className="w-3 h-3 mr-1" />
                                      {t('transport.supportsAlipay')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600">{app.description}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white rounded-lg p-4">
                      <h4 className="text-sm text-gray-900 mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span>{t('transport.paymentMethods')}</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {transport.taxi.paymentMethods.map((method, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                          >
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tips */}
            <div className="bg-purple-50 rounded-xl p-4">
              <h4 className="text-sm text-gray-900 mb-2">{t('transport.tipsTitle')}</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {tips.map((tip, i) => <li key={i}>• {tip}</li>)}
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <Button
            className="w-full bg-red-500 hover:bg-red-600"
            onClick={onClose}
          >
            {t('transport.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
