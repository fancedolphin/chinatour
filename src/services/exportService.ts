import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { TripDetail } from '@/services/tripService';
import { extractTripHighlights, formatTripDateRange, getTripDayCount } from '@/utils/tripShare';

const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

type BudgetCategory = 'transport' | 'meal' | 'attraction' | 'rest' | 'other';

type BudgetRow = {
  day: string;
  transport: number;
  meal: number;
  attraction: number;
  rest: number;
  other: number;
  total: number;
};

const BUDGET_CATEGORY_LABELS: Record<Exclude<BudgetCategory, 'other'>, string> = {
  transport: '交通',
  meal: '餐饮',
  attraction: '景点',
  rest: '住宿',
};

function sanitizeFilename(input: string) {
  return input.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getActivityCategory(type?: string | null): BudgetCategory {
  switch (type) {
    case 'transport':
    case 'transportation':
      return 'transport';
    case 'meal':
    case 'dining':
      return 'meal';
    case 'attraction':
    case 'sightseeing':
      return 'attraction';
    case 'rest':
    case 'accommodation':
      return 'rest';
    default:
      return 'other';
  }
}

function getActivityTypeLabel(type?: string | null) {
  switch (type) {
    case 'transport':
    case 'transportation':
      return '交通';
    case 'meal':
    case 'dining':
      return '用餐';
    case 'attraction':
    case 'sightseeing':
      return '景点';
    case 'rest':
    case 'accommodation':
      return '住宿';
    default:
      return '活动';
  }
}

function parsePriceValue(price?: string | null) {
  if (!price) {
    return 0;
  }

  if (/免费|包含|free|included/i.test(price)) {
    return 0;
  }

  const numbers = [...price.matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  if (numbers.length === 0) {
    return 0;
  }

  if (numbers.length === 1) {
    return numbers[0];
  }

  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function buildBudgetRows(trip: TripDetail) {
  const rows: BudgetRow[] = trip.trip_itineraries
    .slice()
    .sort((a, b) => a.day_number - b.day_number)
    .map((itinerary) => {
      const row: BudgetRow = {
        day: `Day ${itinerary.day_number}`,
        transport: 0,
        meal: 0,
        attraction: 0,
        rest: 0,
        other: 0,
        total: 0,
      };

      for (const activity of itinerary.activities ?? []) {
        const amount = parsePriceValue(activity.price);
        const category = getActivityCategory(activity.type);
        row[category] += amount;
        row.total += amount;
      }

      return row;
    });

  const totals = rows.reduce((summary, row) => ({
    transport: summary.transport + row.transport,
    meal: summary.meal + row.meal,
    attraction: summary.attraction + row.attraction,
    rest: summary.rest + row.rest,
    other: summary.other + row.other,
    total: summary.total + row.total,
  }), {
    transport: 0,
    meal: 0,
    attraction: 0,
    rest: 0,
    other: 0,
    total: 0,
  });

  return { rows, totals };
}

function splitActivities<T>(activities: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < activities.length; index += chunkSize) {
    chunks.push(activities.slice(index, index + chunkSize));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function createOffscreenHost() {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = `${PAGE_WIDTH_PX}px`;
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  host.style.zIndex = '-1';
  document.body.appendChild(host);
  return host;
}

function createPageShell() {
  const page = document.createElement('div');
  page.style.width = `${PAGE_WIDTH_PX}px`;
  page.style.minHeight = `${PAGE_HEIGHT_PX}px`;
  page.style.boxSizing = 'border-box';
  page.style.padding = '48px';
  page.style.background = '#ffffff';
  page.style.color = '#111827';
  page.style.fontFamily = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  page.style.display = 'flex';
  page.style.flexDirection = 'column';
  page.style.gap = '24px';
  return page;
}

function createSectionTitle(title: string, subtitle?: string) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;">
      <div>
        <div style="font-size:28px;font-weight:700;letter-spacing:-0.02em;">${escapeHtml(title)}</div>
        ${subtitle ? `<div style="margin-top:6px;font-size:14px;color:#6b7280;">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div style="width:84px;height:6px;border-radius:999px;background:linear-gradient(90deg,#ef4444,#f97316);"></div>
    </div>
  `;
  return wrapper;
}

function buildCoverPage(trip: TripDetail) {
  const dayCount = getTripDayCount({
    duration: trip.duration,
    startDate: trip.start_date,
    endDate: trip.end_date,
    itinerariesCount: trip.trip_itineraries?.length,
  });
  const highlights = extractTripHighlights(trip, 3);
  const page = createPageShell();
  page.style.justifyContent = 'space-between';
  page.style.background = 'linear-gradient(180deg, #fff7ed 0%, #ffffff 45%, #fff1f2 100%)';

  const coverImage = trip.image_url
    ? `<img src="${escapeHtml(trip.image_url)}" style="width:100%;height:280px;object-fit:cover;border-radius:28px;box-shadow:0 16px 40px rgba(0,0,0,0.12);" crossorigin="anonymous" />`
    : `<div style="width:100%;height:280px;border-radius:28px;background:linear-gradient(135deg,#ef4444,#fb7185,#fdba74);"></div>`;

  page.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:28px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.18em;color:#ef4444;">CHINAVIEW TRIP EXPORT</div>
        <div style="font-size:12px;color:#6b7280;">${escapeHtml(new Date().toLocaleDateString('zh-CN'))}</div>
      </div>
      <div>
        <div style="font-size:48px;font-weight:800;line-height:1.05;letter-spacing:-0.04em;">${escapeHtml(trip.destination || '未命名行程')}</div>
        <div style="margin-top:12px;font-size:18px;color:#4b5563;line-height:1.6;">${escapeHtml(formatTripDateRange(trip.start_date, trip.end_date) || '日期待定')}</div>
      </div>
      ${coverImage}
      <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:16px;">
        <div style="padding:20px;border-radius:24px;background:#ffffff;border:1px solid #fed7aa;">
          <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;">时长</div>
          <div style="margin-top:10px;font-size:28px;font-weight:700;">${escapeHtml(trip.duration || `${dayCount}天`)}</div>
        </div>
        <div style="padding:20px;border-radius:24px;background:#ffffff;border:1px solid #fecdd3;">
          <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;">预算</div>
          <div style="margin-top:10px;font-size:28px;font-weight:700;">${escapeHtml(trip.budget || '未设置')}</div>
        </div>
        <div style="padding:20px;border-radius:24px;background:#ffffff;border:1px solid #fde68a;">
          <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;">行程天数</div>
          <div style="margin-top:10px;font-size:28px;font-weight:700;">${dayCount} 天</div>
        </div>
      </div>
      ${highlights.length > 0 ? `
        <div style="padding:28px;border-radius:28px;background:#ffffff;border:1px solid #e5e7eb;">
          <div style="font-size:16px;font-weight:700;margin-bottom:16px;">行程亮点</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${highlights.map((highlight, index) => `
              <div style="display:flex;gap:12px;align-items:flex-start;">
                <div style="width:28px;height:28px;border-radius:999px;background:linear-gradient(135deg,#ef4444,#fb7185);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;">${index + 1}</div>
                <div style="font-size:16px;line-height:1.5;color:#374151;">${escapeHtml(highlight)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#6b7280;">
      <span>由 Chinaview 自动生成</span>
      <span>${escapeHtml(trip.destination || 'Trip')}</span>
    </div>
  `;

  return page;
}

function buildDayPage(
  trip: TripDetail,
  dayNumber: number,
  dateLabel: string,
  theme: string | null,
  activities: TripDetail['trip_itineraries'][number]['activities'],
  chunkIndex: number,
  chunkCount: number,
) {
  const page = createPageShell();
  const title = `Day ${dayNumber}${theme ? ` · ${theme}` : ''}`;
  const subtitle = chunkCount > 1
    ? `${dateLabel || '日期待定'} · 第 ${chunkIndex + 1}/${chunkCount} 页`
    : (dateLabel || '日期待定');

  page.appendChild(createSectionTitle(title, subtitle));

  const activityGrid = document.createElement('div');
  activityGrid.style.display = 'flex';
  activityGrid.style.flexDirection = 'column';
  activityGrid.style.gap = '18px';

  for (const activity of activities) {
    const card = document.createElement('div');
    card.style.padding = '20px';
    card.style.border = '1px solid #e5e7eb';
    card.style.borderRadius = '24px';
    card.style.background = '#ffffff';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span style="padding:6px 10px;border-radius:999px;background:#fff7ed;color:#ea580c;font-size:12px;font-weight:700;">${escapeHtml(getActivityTypeLabel(activity.type))}</span>
            <span style="font-size:13px;color:#6b7280;">${escapeHtml(activity.time || '时间待定')}</span>
            ${activity.duration ? `<span style="font-size:13px;color:#6b7280;">时长 ${escapeHtml(activity.duration)}</span>` : ''}
          </div>
          <div style="font-size:24px;font-weight:700;line-height:1.25;">${escapeHtml(activity.name || '未命名活动')}</div>
        </div>
        ${activity.price ? `<div style="padding:10px 14px;border-radius:18px;background:#f9fafb;font-size:16px;font-weight:700;color:#111827;">${escapeHtml(activity.price)}</div>` : ''}
      </div>
      ${activity.address ? `<div style="margin-top:14px;font-size:14px;color:#4b5563;line-height:1.6;">地点：${escapeHtml(activity.address)}</div>` : ''}
      ${activity.description ? `<div style="margin-top:12px;font-size:15px;color:#374151;line-height:1.75;">${escapeHtml(activity.description)}</div>` : ''}
    `;
    activityGrid.appendChild(card);
  }

  page.appendChild(activityGrid);

  const footer = document.createElement('div');
  footer.style.marginTop = 'auto';
  footer.style.paddingTop = '16px';
  footer.style.borderTop = '1px solid #e5e7eb';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'space-between';
  footer.style.fontSize = '12px';
  footer.style.color = '#6b7280';
  footer.innerHTML = `
    <span>${escapeHtml(trip.destination || 'Trip')}</span>
    <span>Chinaview Itinerary</span>
  `;
  page.appendChild(footer);

  return page;
}

function buildBudgetPage(trip: TripDetail) {
  const { rows, totals } = buildBudgetRows(trip);
  const page = createPageShell();
  page.appendChild(createSectionTitle('预算汇总', '按天和活动类别估算，实际消费以出行时为准'));

  const summaryCards = document.createElement('div');
  summaryCards.style.display = 'grid';
  summaryCards.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
  summaryCards.style.gap = '12px';
  summaryCards.innerHTML = (Object.entries(BUDGET_CATEGORY_LABELS) as Array<[Exclude<BudgetCategory, 'other'>, string]>)
    .map(([category, label]) => `
      <div style="padding:18px;border-radius:22px;background:#ffffff;border:1px solid #e5e7eb;">
        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;">${label}</div>
        <div style="margin-top:10px;font-size:24px;font-weight:700;">¥${totals[category]}</div>
      </div>
    `).join('');
  page.appendChild(summaryCards);

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = '14px';
  table.innerHTML = `
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:14px 12px;border:1px solid #e5e7eb;text-align:left;">日期</th>
        <th style="padding:14px 12px;border:1px solid #e5e7eb;text-align:right;">交通</th>
        <th style="padding:14px 12px;border:1px solid #e5e7eb;text-align:right;">餐饮</th>
        <th style="padding:14px 12px;border:1px solid #e5e7eb;text-align:right;">景点</th>
        <th style="padding:14px 12px;border:1px solid #e5e7eb;text-align:right;">住宿</th>
        <th style="padding:14px 12px;border:1px solid #e5e7eb;text-align:right;">其他</th>
        <th style="padding:14px 12px;border:1px solid #e5e7eb;text-align:right;">合计</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>
          <td style="padding:12px;border:1px solid #e5e7eb;">${escapeHtml(row.day)}</td>
          <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;">¥${row.transport}</td>
          <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;">¥${row.meal}</td>
          <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;">¥${row.attraction}</td>
          <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;">¥${row.rest}</td>
          <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;">¥${row.other}</td>
          <td style="padding:12px;border:1px solid #e5e7eb;text-align:right;font-weight:700;">¥${row.total}</td>
        </tr>
      `).join('')}
      <tr style="background:#fff7ed;font-weight:700;">
        <td style="padding:12px;border:1px solid #fdba74;">总计</td>
        <td style="padding:12px;border:1px solid #fdba74;text-align:right;">¥${totals.transport}</td>
        <td style="padding:12px;border:1px solid #fdba74;text-align:right;">¥${totals.meal}</td>
        <td style="padding:12px;border:1px solid #fdba74;text-align:right;">¥${totals.attraction}</td>
        <td style="padding:12px;border:1px solid #fdba74;text-align:right;">¥${totals.rest}</td>
        <td style="padding:12px;border:1px solid #fdba74;text-align:right;">¥${totals.other}</td>
        <td style="padding:12px;border:1px solid #fdba74;text-align:right;">¥${totals.total}</td>
      </tr>
    </tbody>
  `;
  page.appendChild(table);

  const notes = document.createElement('div');
  notes.style.padding = '20px';
  notes.style.borderRadius = '24px';
  notes.style.background = '#f9fafb';
  notes.style.color = '#4b5563';
  notes.style.fontSize = '14px';
  notes.style.lineHeight = '1.8';
  notes.innerHTML = `
    <div style="font-weight:700;color:#111827;margin-bottom:8px;">说明</div>
    <div>1. 预算统计基于活动中的价格文本估算，区间价格会取平均值。</div>
    <div>2. “免费”或“包含”按 0 元计入，未标价活动不纳入总计。</div>
    <div>3. 实际费用可能因日期、预订渠道和汇率变化而有所不同。</div>
  `;
  page.appendChild(notes);

  return page;
}

async function addRenderedPage(pdf: jsPDF, host: HTMLDivElement, pageElement: HTMLDivElement, index: number) {
  host.innerHTML = '';
  host.appendChild(pageElement);
  const canvas = await html2canvas(pageElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    width: PAGE_WIDTH_PX,
    height: PAGE_HEIGHT_PX,
    windowWidth: PAGE_WIDTH_PX,
    windowHeight: PAGE_HEIGHT_PX,
  });

  const pageImage = canvas.toDataURL('image/jpeg', 0.96);
  if (index > 0) {
    pdf.addPage();
  }
  pdf.addImage(pageImage, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
}

function buildPageElements(trip: TripDetail) {
  const pages: HTMLDivElement[] = [buildCoverPage(trip)];

  const sortedItineraries = trip.trip_itineraries
    .slice()
    .sort((a, b) => a.day_number - b.day_number);

  for (const itinerary of sortedItineraries) {
    const activities = (itinerary.activities ?? [])
      .slice()
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const chunks = splitActivities(activities, 4);

    chunks.forEach((chunk, chunkIndex) => {
      pages.push(buildDayPage(
        trip,
        itinerary.day_number,
        itinerary.date ? formatTripDateRange(itinerary.date, itinerary.date) : '',
        itinerary.theme,
        chunk,
        chunkIndex,
        chunks.length,
      ));
    });
  }

  pages.push(buildBudgetPage(trip));
  return pages;
}

export function buildTripPdfFileName(trip: TripDetail) {
  const datePart = trip.start_date ? formatTripDateRange(trip.start_date, trip.end_date).replace(/\s+/g, '') : '行程';
  return `${sanitizeFilename(trip.destination || 'trip')}_${sanitizeFilename(datePart || 'trip')}.pdf`;
}

export async function generateTripPDF(trip: TripDetail): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('PDF 导出仅支持浏览器环境');
  }

  const host = createOffscreenHost();
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  try {
    const pages = buildPageElements(trip);
    for (let index = 0; index < pages.length; index += 1) {
      await addRenderedPage(pdf, host, pages[index], index);
    }
    return pdf.output('blob');
  } finally {
    host.remove();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 1000);
}

export async function downloadTripPDF(trip: TripDetail) {
  const blob = await generateTripPDF(trip);
  const filename = buildTripPdfFileName(trip);
  downloadBlob(blob, filename);
}
