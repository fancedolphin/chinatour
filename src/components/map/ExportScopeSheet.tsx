import { useState } from 'react';
import { X, MapPin, Navigation, Apple } from 'lucide-react';
import { motion } from 'motion/react';
import type { ExportScope } from '../../utils/mapExport';
import {
  AMAP_VIA_HARD_LIMIT,
  GOOGLE_MAPS_FREE_WARN,
  APPLE_MAPS_WARN_THRESHOLD,
} from '../../utils/mapExport';

export type ExportApp = 'amap' | 'google' | 'apple';

interface ExportScopeSheetProps {
  scopes: ExportScope[];
  initialScopeIndex: number;
  onExport: (scope: ExportScope, app: ExportApp) => void;
  onClose: () => void;
}

function ExportAppButton({
  icon,
  label,
  sublabel,
  warn,
  iconBg,
  hoverBg,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  warn: string | null;
  iconBg: string;
  hoverBg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 ${hoverBg} active:scale-[0.98] transition-all text-left`}
    >
      <div className={`w-9 h-9 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-[11px] text-gray-400">{sublabel}</div>
      </div>
      {warn && (
        <span className="text-[11px] text-amber-600 text-right max-w-[40%] flex-shrink-0 leading-tight">
          {warn}
        </span>
      )}
    </button>
  );
}

export function ExportScopeSheet({
  scopes,
  initialScopeIndex,
  onExport,
  onClose,
}: ExportScopeSheetProps) {
  const [selectedIdx, setSelectedIdx] = useState(initialScopeIndex);
  const scope = scopes[selectedIdx];
  const count = scope.locations.length;

  // Per-app warnings based on current scope's location count
  const amapWarn =
    count > 12 ? `将截断为前${Math.min(count, AMAP_VIA_HARD_LIMIT + 2)}个地点` : null;
  const googleWarn =
    count > GOOGLE_MAPS_FREE_WARN
      ? `免费版建议≤${GOOGLE_MAPS_FREE_WARN}个途经点，超出可能被忽略`
      : null;
  const appleWarn =
    count > APPLE_MAPS_WARN_THRESHOLD
      ? `途经点较多，部分设备可能无法打开`
      : null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative bg-white rounded-t-2xl w-full px-5 pt-5 pb-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-base font-semibold text-gray-900">导出到地图</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Scope selection — hidden for single-scope trips */}
        {scopes.length > 1 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">选择导出范围</p>
            <div className="flex flex-wrap gap-2">
              {scopes.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    i === selectedIdx
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* App buttons */}
        <p className="text-xs text-gray-500 mb-2">选择地图软件</p>
        <div className="space-y-2">
          <ExportAppButton
            icon={<MapPin className="w-4 h-4 text-white" />}
            label="高德地图"
            sublabel="在高德地图中打开路线"
            warn={amapWarn}
            iconBg="bg-blue-500"
            hoverBg="hover:bg-blue-50"
            onClick={() => onExport(scope, 'amap')}
          />
          <ExportAppButton
            icon={<Navigation className="w-4 h-4 text-white" />}
            label="Google Maps"
            sublabel="在 Google Maps 中打开路线"
            warn={googleWarn}
            iconBg="bg-green-500"
            hoverBg="hover:bg-green-50"
            onClick={() => onExport(scope, 'google')}
          />
          <ExportAppButton
            icon={<Apple className="w-4 h-4 text-white" />}
            label="Apple Maps"
            sublabel="在 Apple 地图中打开路线"
            warn={appleWarn}
            iconBg="bg-gray-800"
            hoverBg="hover:bg-gray-50"
            onClick={() => onExport(scope, 'apple')}
          />
        </div>
      </motion.div>
    </div>
  );
}
