import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Filter,
  GripVertical,
  LayoutGrid,
  LayoutList,
  Plus,
  Rows3,
  Search,
  X,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { BookingDetail } from './BookingDetail';
import { mockBookings, mockResources, mockVariants } from '../../lib/mock-data';
import type { Booking, BookingStatus, Resource, ResourceVariant } from '../../types';

type ViewMode = 'timeline' | 'calendar' | 'table' | 'kanban';
type ZoomLevel = 'hour' | 'day' | 'week';
type GroupByMode = 'activity' | 'resource' | 'sku';
type RowType = 'category' | 'resource' | 'variant';

type BookingRecord = Booking & {
  categoryName: string;
  locationName: string;
  rowId: string;
  resourceStatus: Resource['status'];
  resolvedVariantId?: string;
  startMs: number;
  endMs: number;
};

type TimelineRow = {
  id: string;
  type: RowType;
  label: string;
  depth: number;
  categoryName: string;
  locationName: string;
  status: string;
  resourceId?: string;
  variantId?: string;
  parentId?: string;
  bookingCount: number;
  utilization: number;
  isBookable: boolean;
  meta: string;
  capacity?: number;
  imageUrl?: string;
  sku?: string;
};

type TimelineTick = {
  key: string;
  label: string;
  subLabel?: string;
  startMs: number;
  isMajor?: boolean;
};

type PositionedBooking = BookingRecord & {
  lane: number;
  hasConflict: boolean;
};

type OccupancySegment = {
  key: string;
  startMs: number;
  endMs: number;
  unitCount: number;
  bookingIds: string[];
  hasConflict: boolean;
};

type InteractionState =
  | {
      bookingId: string;
      mode: 'move';
      originRowId: string;
      draftRowId: string;
      originStartMs: number;
      originEndMs: number;
      pointerStartX: number;
    }
  | null;

type DraftBookingSeed = {
  rowId: string;
  resourceId: string;
  variantId?: string;
  startMs: number;
  endMs: number;
};

const viewItems: Array<{ value: ViewMode; label: string; icon: typeof Rows3 }> = [
  { value: 'timeline', label: 'Таймлайн', icon: Rows3 },
  { value: 'calendar', label: 'Календарь', icon: CalendarDays },
  { value: 'table', label: 'Таблица', icon: LayoutList },
  { value: 'kanban', label: 'Канбан', icon: LayoutGrid },
];

const zoomItems: Array<{ value: ZoomLevel; label: string }> = [
  { value: 'hour', label: 'Час' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
];

const groupByItems: Array<{ value: GroupByMode; label: string }> = [
  { value: 'activity', label: 'Активность' },
  { value: 'resource', label: 'Ресурс' },
  { value: 'sku', label: 'SKU' },
];

const statusOptions = [
  { value: '', label: 'Все статусы' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'confirmed', label: 'Подтверждено' },
  { value: 'completed', label: 'Завершено' },
  { value: 'cancelled', label: 'Отменено' },
  { value: 'no_show', label: 'Неявка' },
];

const locationByCategory: Record<string, string> = {
  'Горные велосипеды': 'Северный хаб',
  'Лыжное оборудование': 'Альпийский склад',
  'Водный спорт': 'Речной док',
  'Скалолазное снаряжение': 'Склад восхождения',
  'Камеры и электроника': 'Городской локер',
  'Перевозка и багаж': 'Транзитная зона',
  'Кемпинг': 'Туристический склад',
};

const zoomConfig: Record<
  ZoomLevel,
  {
    tickWidth: number;
    tickMinutes: number;
    rangeMinutes: number;
    stepMinutes: number;
    shiftMinutes: number;
  }
> = {
  hour: {
    tickWidth: 88,
    tickMinutes: 60,
    rangeMinutes: 24 * 60,
    stepMinutes: 15,
    shiftMinutes: 24 * 60,
  },
  day: {
    tickWidth: 180,
    tickMinutes: 24 * 60,
    rangeMinutes: 7 * 24 * 60,
    stepMinutes: 60,
    shiftMinutes: 7 * 24 * 60,
  },
  week: {
    tickWidth: 56,
    tickMinutes: 24 * 60,
    rangeMinutes: 28 * 24 * 60,
    stepMinutes: 24 * 60,
    shiftMinutes: 7 * 24 * 60,
  },
};

const WINDOW_PRELOAD_BLOCKS = 2;
const WINDOW_INITIAL_BLOCKS = 7;
const WINDOW_EXTEND_BLOCKS = 2;
const RESOURCE_UNIT_STACK_HEIGHT = 8;
const RESOURCE_TRACK_BASE_HEIGHT = 22;

const statusBadge: Record<
  BookingStatus,
  { label: string; variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray' }
> = {
  confirmed: { label: 'Подтверждено', variant: 'green' },
  pending: { label: 'Ожидает', variant: 'yellow' },
  cancelled: { label: 'Отменено', variant: 'red' },
  completed: { label: 'Завершено', variant: 'blue' },
  no_show: { label: 'Неявка', variant: 'gray' },
};

const TOOLBAR_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[#f8fafc]';
const FLYOUT_ACTION_BUTTON_CLASS =
  'rounded-lg border border-[#d7e0ea] px-3 py-2 text-xs font-medium text-[#334155] transition-colors hover:bg-[#f8fafc]';

interface BookingsPageProps {
  onHeaderActionsChange?: (actions: ReactNode) => void;
}

export function BookingsPage({ onHeaderActionsChange }: BookingsPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [groupBy, setGroupBy] = useState<GroupByMode>('resource');
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(new Date(mockBookings[0]?.selection.startDate || new Date())));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [focusedResourceId, setFocusedResourceId] = useState('');
  const [focusedVariantId, setFocusedVariantId] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [hideEmptyResources, setHideEmptyResources] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showFilterFlyout, setShowFilterFlyout] = useState(false);
  const [showDateFlyout, setShowDateFlyout] = useState(false);
  const [showViewFlyout, setShowViewFlyout] = useState(false);
  const [flyoutPositions, setFlyoutPositions] = useState<{
    view?: { top: number; left: number };
    date?: { top: number; left: number };
    filter?: { top: number; left: number };
  }>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stackedSegmentDetail, setStackedSegmentDetail] = useState<{
    rowLabel: string;
    startMs: number;
    endMs: number;
    unitCount: number;
    bookingIds: string[];
  } | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [draftSeed, setDraftSeed] = useState<DraftBookingSeed | null>(null);
  const [draftName, setDraftName] = useState('');
  const [interaction, setInteraction] = useState<InteractionState>(null);
  const [draftBookingMap, setDraftBookingMap] = useState<Record<string, { rowId: string; startMs: number; endMs: number }>>({});
  const [windowStartBlocks, setWindowStartBlocks] = useState(-WINDOW_PRELOAD_BLOCKS);
  const [windowBlockCount, setWindowBlockCount] = useState(WINDOW_INITIAL_BLOCKS);
  const [timelineResetKey, setTimelineResetKey] = useState(0);
  const [rangeDraftStart, setRangeDraftStart] = useState(() => formatDateInputValue(startOfDay(new Date(mockBookings[0]?.selection.startDate || new Date()))));
  const [rangeDraftEnd, setRangeDraftEnd] = useState(() => formatDateInputValue(addDays(startOfDay(new Date(mockBookings[0]?.selection.startDate || new Date())), 7)));
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    () => mockResources.map(resource => resource.id)
  );
  const [drilldownResourceIds, setDrilldownResourceIds] = useState<string[] | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const viewFlyoutRef = useRef<HTMLDivElement | null>(null);
  const dateFlyoutRef = useRef<HTMLDivElement | null>(null);
  const filterFlyoutRef = useRef<HTMLDivElement | null>(null);
  const applyingHistoryStateRef = useRef(false);
  const historyReadyRef = useRef(false);

  const resourceLookup = useMemo(
    () => new Map(mockResources.map(resource => [resource.id, resource])),
    []
  );
  const allResourceIds = useMemo(() => mockResources.map(resource => resource.id), []);
  const validResourceIdSet = useMemo(() => new Set(allResourceIds), [allResourceIds]);
  const variantLookup = useMemo(
    () => new Map(mockVariants.map(variant => [variant.id, variant])),
    []
  );
  const effectiveResourceIds = useMemo(
    () => (drilldownResourceIds ? drilldownResourceIds : selectedResourceIds),
    [drilldownResourceIds, selectedResourceIds]
  );

  useEffect(() => {
    if (window.location.pathname !== '/bookings') {
      return;
    }

    const parseIds = (raw: string | null) =>
      raw
        ? raw
            .split(',')
            .map(item => item.trim())
            .filter(item => validResourceIdSet.has(item))
        : [];

    const applyUrlState = (search: string) => {
      const params = new URLSearchParams(search);
      const nextGroupBy = params.get('g');
      const nextGroup: GroupByMode =
        nextGroupBy === 'activity' || nextGroupBy === 'resource' || nextGroupBy === 'sku'
          ? nextGroupBy
          : 'resource';
      const nextZoomParam = params.get('z');
      const nextZoom: ZoomLevel =
        nextZoomParam === 'hour' || nextZoomParam === 'day' || nextZoomParam === 'week'
          ? nextZoomParam
          : 'day';

      const nextSearch = params.get('q') || '';
      const nextStatus = params.get('st') || '';
      const nextCategory = params.get('cat') || '';
      const nextLocation = params.get('loc') || '';
      const nextFocusedResource = params.get('res') || '';
      const nextFocusedVariant = params.get('var') || '';
      const nextActiveOnly = params.get('act') !== '0';
      const nextHideEmpty = params.get('hide') === '1';
      const nextSelectedResources = parseIds(params.get('sel'));
      const nextDrilldownResources = parseIds(params.get('dr'));
      const nextAnchorRaw = Number(params.get('a'));
      const nextAnchor = Number.isFinite(nextAnchorRaw) ? startOfDay(new Date(nextAnchorRaw)) : null;

      setGroupBy(nextGroup);
      setZoom(nextZoom);
      if (nextAnchor) {
        setAnchorDate(nextAnchor);
      }
      setSearch(nextSearch);
      setStatusFilter(nextStatus);
      setCategoryFilter(nextCategory);
      setLocationFilter(nextLocation);
      setFocusedResourceId(nextFocusedResource);
      setFocusedVariantId(nextFocusedVariant);
      setActiveOnly(nextActiveOnly);
      setHideEmptyResources(nextHideEmpty);
      setSelectedResourceIds(nextSelectedResources.length ? nextSelectedResources : allResourceIds);
      setDrilldownResourceIds(nextDrilldownResources.length ? nextDrilldownResources : null);
    };

    applyingHistoryStateRef.current = true;
    applyUrlState(window.location.search);
    setTimeout(() => {
      applyingHistoryStateRef.current = false;
    }, 0);
    historyReadyRef.current = true;

    const onPopState = () => {
      if (window.location.pathname !== '/bookings') {
        return;
      }
      applyingHistoryStateRef.current = true;
      applyUrlState(window.location.search);
      setTimeout(() => {
        applyingHistoryStateRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [allResourceIds, validResourceIdSet]);

  useEffect(() => {
    if (window.location.pathname !== '/bookings') {
      return;
    }
    if (applyingHistoryStateRef.current) {
      return;
    }

    const params = new URLSearchParams();
    if (groupBy !== 'resource') {
      params.set('g', groupBy);
    }
    if (zoom !== 'day') {
      params.set('z', zoom);
    }
    if (search) {
      params.set('q', search);
    }
    if (statusFilter) {
      params.set('st', statusFilter);
    }
    if (categoryFilter) {
      params.set('cat', categoryFilter);
    }
    if (locationFilter) {
      params.set('loc', locationFilter);
    }
    if (focusedResourceId) {
      params.set('res', focusedResourceId);
    }
    if (focusedVariantId) {
      params.set('var', focusedVariantId);
    }
    if (!activeOnly) {
      params.set('act', '0');
    }
    if (hideEmptyResources) {
      params.set('hide', '1');
    }
    if (anchorDate) {
      params.set('a', String(anchorDate.getTime()));
    }

    const sortedSelected = [...selectedResourceIds].sort();
    const sortedAll = [...allResourceIds].sort();
    if (sortedSelected.join(',') !== sortedAll.join(',')) {
      params.set('sel', sortedSelected.join(','));
    }

    if (drilldownResourceIds?.length) {
      params.set('dr', [...drilldownResourceIds].sort().join(','));
    }

    const nextSearch = params.toString();
    const currentSearch = window.location.search.startsWith('?')
      ? window.location.search.slice(1)
      : window.location.search;
    if (nextSearch === currentSearch) {
      return;
    }

    const nextUrl = nextSearch ? `/bookings?${nextSearch}` : '/bookings';
    if (historyReadyRef.current) {
      window.history.pushState({}, '', nextUrl);
    } else {
      window.history.replaceState({}, '', nextUrl);
      historyReadyRef.current = true;
    }
  }, [
    activeOnly,
    allResourceIds,
    anchorDate,
    categoryFilter,
    drilldownResourceIds,
    focusedResourceId,
    focusedVariantId,
    groupBy,
    hideEmptyResources,
    locationFilter,
    search,
    selectedResourceIds,
    statusFilter,
    zoom,
  ]);

  const locationOptions = useMemo(
    () => [
      { value: '', label: 'Все локации' },
      ...Array.from(
          new Set(mockResources.map(resource => locationByCategory[resource.categoryName] || 'Главный хаб'))
      )
        .sort()
        .map(location => ({ value: location, label: location })),
    ],
    []
  );

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Все категории' },
      ...Array.from(new Set(mockResources.map(resource => resource.categoryName)))
        .sort()
        .map(category => ({ value: category, label: category })),
    ],
    []
  );

  const alignedAnchor = useMemo(() => alignAnchor(anchorDate, zoom), [anchorDate, zoom]);
  const rangeStart = useMemo(
    () => new Date(alignedAnchor.getTime() + windowStartBlocks * zoomConfig[zoom].rangeMinutes * 60_000),
    [alignedAnchor, windowStartBlocks, zoom]
  );
  const rangeEnd = useMemo(
    () => new Date(rangeStart.getTime() + windowBlockCount * zoomConfig[zoom].rangeMinutes * 60_000),
    [rangeStart, windowBlockCount, zoom]
  );

  const pixelsPerMinute = zoomConfig[zoom].tickWidth / zoomConfig[zoom].tickMinutes;
  const leftWidth = 320;
  const canvasWidth = windowBlockCount * zoomConfig[zoom].rangeMinutes * pixelsPerMinute;
  const initialScrollLeft = WINDOW_PRELOAD_BLOCKS * zoomConfig[zoom].rangeMinutes * pixelsPerMinute;

  const bookingRecords = useMemo<BookingRecord[]>(
    () =>
      bookings.map(booking => {
        const resource = resourceLookup.get(booking.selection.resourceId);
        const locationName = locationByCategory[resource?.categoryName || ''] || 'Главный хаб';
        const startMs = new Date(booking.selection.startDate).getTime();
        const endMs = booking.selection.endDate
          ? new Date(booking.selection.endDate).getTime()
          : startMs + 60 * 60 * 1000;
        const resolvedVariantId = resolveVariantId(
          booking.selection.resourceId,
          booking.selection.variantId,
          booking.selection.variantTitle
        );

        return {
          ...booking,
          categoryName: resource?.categoryName || 'Без категории',
          locationName,
          rowId: `resource:${booking.selection.resourceId}`,
          resourceStatus: resource?.status || 'inactive',
          resolvedVariantId,
          startMs,
          endMs,
        };
      }),
    [bookings, resourceLookup]
  );

  const filteredBookings = useMemo(
    () =>
      bookingRecords.filter(booking => {
        const matchesSearch =
          !search ||
          booking.ref.toLowerCase().includes(search.toLowerCase()) ||
          booking.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          booking.selection.resourceTitle.toLowerCase().includes(search.toLowerCase()) ||
          booking.selection.offerTitle.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !statusFilter || booking.status === statusFilter;
        const matchesCategory = !categoryFilter || booking.categoryName === categoryFilter;
        const matchesLocation = !locationFilter || booking.locationName === locationFilter;
        const matchesResource = !focusedResourceId || booking.selection.resourceId === focusedResourceId;
        const matchesVariant = !focusedVariantId || booking.resolvedVariantId === focusedVariantId;
        const matchesActive = !activeOnly || booking.resourceStatus === 'active';
        const matchesSelectedResources = effectiveResourceIds.includes(booking.selection.resourceId);

        return (
          matchesSearch &&
          matchesStatus &&
          matchesCategory &&
          matchesLocation &&
          matchesResource &&
          matchesVariant &&
          matchesActive &&
          matchesSelectedResources
        );
      }),
    [activeOnly, bookingRecords, categoryFilter, effectiveResourceIds, focusedResourceId, focusedVariantId, locationFilter, search, statusFilter]
  );

  const timelineBookings = useMemo(
    () => filteredBookings.filter(booking => booking.startMs < rangeEnd.getTime() && booking.endMs > rangeStart.getTime()),
    [filteredBookings, rangeEnd, rangeStart]
  );

  const filterableResources = useMemo(
    () =>
      mockResources.filter(resource => {
        const locationName = locationByCategory[resource.categoryName] || 'Главный хаб';
        const matchesCategory = !categoryFilter || resource.categoryName === categoryFilter;
        const matchesLocation = !locationFilter || locationName === locationFilter;
        const matchesResource = !focusedResourceId || resource.id === focusedResourceId;
        const matchesVariant = !focusedVariantId || mockVariants.some(variant => variant.id === focusedVariantId && variant.resourceId === resource.id);
        const matchesActive = !activeOnly || resource.status === 'active';
        return matchesCategory && matchesLocation && matchesResource && matchesVariant && matchesActive;
      }),
    [activeOnly, categoryFilter, focusedResourceId, focusedVariantId, locationFilter]
  );

  const visibleResources = useMemo(
    () => filterableResources.filter(resource => effectiveResourceIds.includes(resource.id)),
    [effectiveResourceIds, filterableResources]
  );

  const rowDefinitions = useMemo<TimelineRow[]>(() => {
    if (groupBy === 'activity') {
      return Array.from(
        visibleResources.reduce<Map<string, Resource[]>>((acc, resource) => {
          const current = acc.get(resource.categoryId) || [];
          current.push(resource);
          acc.set(resource.categoryId, current);
          return acc;
        }, new Map())
      )
        .map(([categoryId, resources]) => {
          const categoryName = resources[0]?.categoryName || 'Без категории';
        const categoryBookings = timelineBookings.filter(booking =>
          resources.some(resource => booking.selection.resourceId === resource.id)
        );

          return {
            id: `category:${categoryId}`,
            type: 'category' as const,
            label: categoryName,
            depth: 0,
            categoryName,
            locationName: locationByCategory[categoryName] || 'Главный хаб',
            status: 'group',
            bookingCount: categoryBookings.length,
            utilization: computeUtilization(categoryBookings, rangeStart.getTime(), rangeEnd.getTime()),
            isBookable: false,
            meta: `Ресурсов: ${resources.length}`,
            capacity: resources.length,
          };
        })
        .filter(row => !hideEmptyResources || row.bookingCount > 0)
        .sort((a, b) => {
          if (a.bookingCount === 0 && b.bookingCount > 0) {
            return 1;
          }
          if (b.bookingCount === 0 && a.bookingCount > 0) {
            return -1;
          }
          return a.label.localeCompare(b.label);
        });
    }

    if (groupBy === 'sku') {
      const variantRows = visibleResources.flatMap(resource => {
        const catalogVariants = mockVariants.filter(variant => {
          const matchesResource = variant.resourceId === resource.id;
          const matchesFocusedVariant = !focusedVariantId || variant.id === focusedVariantId;
          const matchesActiveVariant = !activeOnly || variant.status === 'active';
          return matchesResource && matchesFocusedVariant && matchesActiveVariant;
        });

        const catalogVariantIds = new Set(catalogVariants.map(variant => variant.id));
        const bookingOnlyVariantIds = Array.from(
          new Set(
            timelineBookings
              .filter(
                booking =>
                  booking.selection.resourceId === resource.id &&
                  Boolean(booking.resolvedVariantId) &&
                  (!focusedVariantId || booking.resolvedVariantId === focusedVariantId)
              )
              .map(booking => booking.resolvedVariantId as string)
              .filter(variantId => !catalogVariantIds.has(variantId))
          )
        );

        const bookingOnlyVariants = bookingOnlyVariantIds.map(variantId => {
          const sampleBooking = timelineBookings.find(
            booking => booking.selection.resourceId === resource.id && booking.resolvedVariantId === variantId
          );
          return {
            id: variantId,
            resourceId: resource.id,
            title: sampleBooking?.selection.variantTitle || variantId,
            sku: variantId,
            status: 'active' as const,
            stock: 1,
          };
        });

        return [...catalogVariants, ...bookingOnlyVariants].map(variant => {
          const variantBookings = timelineBookings.filter(
            booking =>
              booking.selection.resourceId === resource.id &&
              booking.resolvedVariantId === variant.id
          );

          return {
            id: `variant:${variant.id}`,
            type: 'variant' as const,
            label: `${resource.title} · ${variant.title}`,
            depth: 0,
            categoryName: resource.categoryName,
            locationName: locationByCategory[resource.categoryName] || 'Главный хаб',
            status: variant.status,
            resourceId: resource.id,
            variantId: variant.id,
            bookingCount: variantBookings.length,
            utilization: computeUtilization(variantBookings, rangeStart.getTime(), rangeEnd.getTime()),
            isBookable: resource.status === 'active' && variant.status === 'active',
            meta: variant.sku || resource.categoryName || variant.status,
            capacity: Math.max(variant.stock || 1, 1),
            imageUrl: resource.imageUrl,
            sku: variant.sku,
          };
        });
      });

      return variantRows
        .filter(row => !hideEmptyResources || row.bookingCount > 0)
        .sort((a, b) => {
          if (a.bookingCount === 0 && b.bookingCount > 0) {
            return 1;
          }
          if (b.bookingCount === 0 && a.bookingCount > 0) {
            return -1;
          }
          return a.label.localeCompare(b.label);
        });
    }

    return visibleResources
      .map(resource => {
        const variants = mockVariants.filter(variant => variant.resourceId === resource.id && variant.status === 'active');
        const resourceBookings = timelineBookings.filter(booking => booking.selection.resourceId === resource.id);
        const capacity = Math.max(variants.length, 1);

        return {
          id: `resource:${resource.id}`,
          type: 'resource' as const,
          label: resource.title,
          depth: 0,
          categoryName: resource.categoryName,
          locationName: locationByCategory[resource.categoryName] || 'Main Hub',
          status: resource.status,
          resourceId: resource.id,
          bookingCount: resourceBookings.length,
          utilization: computeUtilization(resourceBookings, rangeStart.getTime(), rangeEnd.getTime()),
          isBookable: resource.status === 'active',
          meta: variants.length ? `${resource.categoryName} · SKU: ${variants.length}` : resource.categoryName,
          capacity,
          imageUrl: resource.imageUrl,
        };
      })
      .filter(row => !hideEmptyResources || row.bookingCount > 0)
      .sort((a, b) => {
        if (a.bookingCount === 0 && b.bookingCount > 0) {
          return 1;
        }
        if (b.bookingCount === 0 && a.bookingCount > 0) {
          return -1;
        }
        return a.label.localeCompare(b.label);
      });
  }, [
    activeOnly,
    categoryFilter,
    groupBy,
    hideEmptyResources,
    locationFilter,
    focusedResourceId,
    focusedVariantId,
    rangeEnd,
    rangeStart,
    effectiveResourceIds,
    resourceLookup,
    timelineBookings,
    visibleResources,
  ]);

  const rowLookup = useMemo(() => new Map(rowDefinitions.map(row => [row.id, row])), [rowDefinitions]);

  const rowLayouts = useMemo(() => {
    return rowDefinitions.reduce<Record<string, { bookings: PositionedBooking[]; laneCount: number }>>(
      (acc, row) => {
        const rowBookings = timelineBookings
          .filter(booking => getBookingRowId(booking, groupBy) === row.id)
          .map(booking => ({ ...booking, rowId: getBookingRowId(booking, groupBy) }));

        acc[row.id] = layoutRowBookings(rowBookings);
        return acc;
      },
      {}
    );
  }, [groupBy, rowDefinitions, timelineBookings]);

  const selectedBooking = useMemo(
    () => bookings.find(booking => booking.id === selectedBookingId) || null,
    [bookings, selectedBookingId]
  );
  const stackedSegmentBookings = useMemo(
    () =>
      stackedSegmentDetail
        ? stackedSegmentDetail.bookingIds
            .map(bookingId => bookingRecords.find(booking => booking.id === bookingId))
            .filter((booking): booking is BookingRecord => Boolean(booking))
        : [],
    [bookingRecords, stackedSegmentDetail]
  );

  const timelineTicks = useMemo(
    () => buildTimelineTicks(rangeStart, rangeEnd, zoom),
    [rangeEnd, rangeStart, zoom]
  );

  const nowX = useMemo(() => {
    const now = Date.now();
    if (now < rangeStart.getTime() || now > rangeEnd.getTime()) {
      return null;
    }
    return (now - rangeStart.getTime()) / 60_000 * pixelsPerMinute;
  }, [pixelsPerMinute, rangeEnd, rangeStart]);

  const activeFilterCount = [
    search,
    statusFilter,
    categoryFilter,
    locationFilter,
    focusedResourceId,
    focusedVariantId,
    filterableResources.length && selectedResourceIds.length !== filterableResources.length
      ? `resources:${selectedResourceIds.length}`
      : '',
    hideEmptyResources ? 'hide-empty' : '',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setLocationFilter('');
    setFocusedResourceId('');
    setFocusedVariantId('');
    setActiveOnly(true);
    setHideEmptyResources(false);
    setSelectedResourceIds(mockResources.map(resource => resource.id));
    setDrilldownResourceIds(null);
  };

  const resetTimelineWindow = (nextAnchorDate?: Date, nextZoom?: ZoomLevel) => {
    if (nextAnchorDate) {
      setAnchorDate(nextAnchorDate);
    }
    if (nextZoom) {
      setZoom(nextZoom);
    }
    setWindowStartBlocks(-WINDOW_PRELOAD_BLOCKS);
    setWindowBlockCount(WINDOW_INITIAL_BLOCKS);
    setTimelineResetKey(current => current + 1);
  };

  const handleFlyoutClick = (e: React.MouseEvent, flyoutKey: 'view' | 'date' | 'filter') => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFlyoutPositions(prev => ({
      ...prev,
      [flyoutKey]: { top: rect.bottom + 8, left: rect.left }
    }));
    
    if (flyoutKey === 'view') {
      setShowViewFlyout(true);
    } else if (flyoutKey === 'date') {
      setShowDateFlyout(true);
    } else if (flyoutKey === 'filter') {
      setShowFilterFlyout(true);
    }
  };

  const applyTimelinePreset = (preset: 'day' | 'week' | 'month') => {
    const nextStart = preset === 'month' ? startOfWeek(anchorDate) : startOfDay(anchorDate);
    const nextEnd = addDays(nextStart, preset === 'day' ? 1 : preset === 'week' ? 7 : 28);
    setRangeDraftStart(formatDateInputValue(nextStart));
    setRangeDraftEnd(formatDateInputValue(nextEnd));
    resetTimelineWindow(nextStart, preset === 'day' ? 'hour' : preset === 'week' ? 'day' : 'week');
    setShowDateFlyout(false);
  };

  const applyCustomRange = () => {
    if (!rangeDraftStart) {
      return;
    }

    const nextStart = startOfDay(new Date(rangeDraftStart));
    const nextEnd = rangeDraftEnd ? startOfDay(new Date(rangeDraftEnd)) : addDays(nextStart, 7);
    const diffDays = Math.max(1, Math.round((nextEnd.getTime() - nextStart.getTime()) / (24 * 60 * 60 * 1000)));
    const nextZoom: ZoomLevel = diffDays <= 1 ? 'hour' : diffDays <= 7 ? 'day' : 'week';
    resetTimelineWindow(nextStart, nextZoom);
    setShowDateFlyout(false);
  };

  const shiftTimelineWindow = (direction: -1 | 1) => {
    resetTimelineWindow(new Date(anchorDate.getTime() + direction * zoomConfig[zoom].shiftMinutes * 60_000));
  };

  const jumpTimelineToToday = () => {
    resetTimelineWindow(startOfDay(new Date()));
  };

  const handleGroupByChange = (nextGroupBy: GroupByMode) => {
    setGroupBy(nextGroupBy);
    setFocusedResourceId('');
    setFocusedVariantId('');
    setDrilldownResourceIds(null);
    if (nextGroupBy === 'sku') {
      // Root category filtering is only surfaced for activity/resource grouping.
      // Clear hidden root-category selection when switching to SKU grouping.
      setCategoryFilter('');
    }
  };

  const toggleResourceSelection = (resourceId: string) => {
    setDrilldownResourceIds(null);
    setSelectedResourceIds(current =>
      current.includes(resourceId) ? current.filter(id => id !== resourceId) : [...current, resourceId]
    );
  };

  const toggleAllVisibleResources = () => {
    setDrilldownResourceIds(null);
    const visibleIds = resourceFilterOptions.map(resource => resource.id);
    const areAllVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedResourceIds.includes(id));
    if (areAllVisibleSelected) {
      setSelectedResourceIds(current => current.filter(id => !visibleIds.includes(id)));
      return;
    }
    setSelectedResourceIds(current => Array.from(new Set([...current, ...visibleIds])));
  };

  const resourceFilterOptions = useMemo(
    () =>
      filterableResources
        .map(resource => ({
          id: resource.id,
          title: resource.title,
          status: resource.status,
          categoryName: resource.categoryName,
          imageUrl: resource.imageUrl,
          variantCount: Math.max(
            mockVariants.filter(variant => variant.resourceId === resource.id && variant.status === 'active').length,
            1
          ),
        }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    [filterableResources]
  );

  const updateBookingFromDraft = (draft: { bookingId: string; rowId: string; startMs: number; endMs: number }) => {
    const row = rowLookup.get(draft.rowId);
    if (!row || !row.isBookable) {
      return;
    }

    setBookings(current =>
      current.map(booking => {
        if (booking.id !== draft.bookingId) {
          return booking;
        }

        const nextSelection = { ...booking.selection };
        nextSelection.startDate = new Date(draft.startMs).toISOString();
        nextSelection.endDate = new Date(draft.endMs).toISOString();

        if (row.type === 'variant' && row.variantId && row.resourceId) {
          const variant = variantLookup.get(row.variantId);
          const resource = resourceLookup.get(row.resourceId);
          if (variant && resource) {
            nextSelection.resourceId = resource.id;
            nextSelection.resourceTitle = resource.title;
            nextSelection.variantId = variant.id;
            nextSelection.variantTitle = variant.title;
          }
        } else if (row.type === 'resource' && row.resourceId) {
          const resource = resourceLookup.get(row.resourceId);
          if (resource) {
            nextSelection.resourceId = resource.id;
            nextSelection.resourceTitle = resource.title;
            delete nextSelection.variantId;
            delete nextSelection.variantTitle;
          }
        }

        return {
          ...booking,
          selection: nextSelection,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  useEffect(() => {
    if (!interaction) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const scrollNode = scrollRef.current;
      if (!scrollNode) {
        return;
      }

      const deltaX = event.clientX - interaction.pointerStartX;
      const deltaMinutes = snapMinutes(deltaX / pixelsPerMinute, zoomConfig[zoom].stepMinutes);
      const nextStartMs = interaction.originStartMs + deltaMinutes * 60_000;
      const nextEndMs = interaction.originEndMs + deltaMinutes * 60_000;

      const hoveredRowElement = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-scheduler-row-id]') as HTMLElement | null;

      setDraftBookingMap({
        [interaction.bookingId]: {
          rowId:
            interaction.mode === 'move' && hoveredRowElement?.dataset.schedulerRowId
              ? hoveredRowElement.dataset.schedulerRowId
              : interaction.originRowId,
          startMs: nextStartMs,
          endMs: nextEndMs,
        },
      });
    };

    const onPointerUp = () => {
      const draft = draftBookingMap[interaction.bookingId];
      if (draft) {
        updateBookingFromDraft({
          bookingId: interaction.bookingId,
          rowId: draft.rowId,
          startMs: draft.startMs,
          endMs: draft.endMs,
        });
      }

      setInteraction(null);
      setDraftBookingMap({});
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [draftBookingMap, interaction, pixelsPerMinute, rowLookup, zoom]);

  useEffect(() => {
    if (!showViewFlyout && !showDateFlyout && !showFilterFlyout) {
      return;
    }

    const closeFlyouts = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (
        viewFlyoutRef.current?.contains(targetNode) ||
        dateFlyoutRef.current?.contains(targetNode) ||
        filterFlyoutRef.current?.contains(targetNode)
      ) {
        return;
      }
      setShowViewFlyout(false);
      setShowDateFlyout(false);
      setShowFilterFlyout(false);
    };

    window.addEventListener('mousedown', closeFlyouts);
    return () => window.removeEventListener('mousedown', closeFlyouts);
  }, [showDateFlyout, showFilterFlyout, showViewFlyout]);

  const headerActions = useMemo(
    () => (
      <>
        <div className="hidden items-center gap-2 xl:flex">
          <div ref={viewFlyoutRef}>
            <button
              onClick={(e) => handleFlyoutClick(e, 'view')}
              className={`${TOOLBAR_BUTTON_CLASS} text-[#334155] shadow-sm`}
            >
              {(() => {
                const currentView = viewItems.find(item => item.value === viewMode) || viewItems[0];
                const Icon = currentView.icon;
                return (
                  <>
                    <Icon size={14} />
                    {currentView.label}
                    <ChevronDown size={14} className={`transition-transform ${showViewFlyout ? 'rotate-180' : ''}`} />
                  </>
                );
              })()}
            </button>
            {showViewFlyout && flyoutPositions.view ? (
              <div 
                className="fixed z-[300] min-w-[180px] rounded-xl border border-[#cbd5e1] bg-white p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
                style={{ top: `${flyoutPositions.view.top}px`, left: `${flyoutPositions.view.left}px` }}
              >
                {viewItems.map(item => {
                  const Icon = item.icon;
                  const active = item.value === viewMode;
                  return (
                    <button
                      key={item.value}
                      onClick={() => {
                        setViewMode(item.value);
                        setShowViewFlyout(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                        active
                          ? 'bg-[#e7f1ff] text-[#084298]'
                          : 'text-[#556579] hover:bg-[#f8fafc] hover:text-[#1f2d3d]'
                      }`}
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div ref={dateFlyoutRef} className="relative z-[260]">
            <button
              onClick={() => setShowDateFlyout(current => !current)}
              className={`${TOOLBAR_BUTTON_CLASS} text-[#334155] shadow-sm`}
            >
              <CalendarDays size={14} />
              {formatVisibleRange(rangeStart, rangeEnd)}
              <ChevronDown size={14} className={`transition-transform ${showDateFlyout ? 'rotate-180' : ''}`} />
            </button>

            {showDateFlyout ? (
              <div className="absolute left-0 top-[calc(100%+8px)] z-[300] w-[360px] rounded-xl border border-[#cbd5e1] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={jumpTimelineToToday} className={FLYOUT_ACTION_BUTTON_CLASS}>Сегодня</button>
                  <button onClick={() => applyTimelinePreset('day')} className={FLYOUT_ACTION_BUTTON_CLASS}>День</button>
                  <button onClick={() => applyTimelinePreset('week')} className={FLYOUT_ACTION_BUTTON_CLASS}>Неделя</button>
                  <button onClick={() => applyTimelinePreset('month')} className={FLYOUT_ACTION_BUTTON_CLASS}>4 недели</button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button onClick={() => shiftTimelineWindow(-1)} className={FLYOUT_ACTION_BUTTON_CLASS}>Назад</button>
                  <button onClick={jumpTimelineToToday} className={FLYOUT_ACTION_BUTTON_CLASS}>К сегодня</button>
                  <button onClick={() => shiftTimelineWindow(1)} className={FLYOUT_ACTION_BUTTON_CLASS}>Вперед</button>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-medium text-[#475569]">
                    Начало
                    <input
                      type="date"
                      value={rangeDraftStart}
                      onChange={event => setRangeDraftStart(event.target.value)}
                      className="mt-1 w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm text-[#0f172a]"
                    />
                  </label>
                  <label className="block text-xs font-medium text-[#475569]">
                    Конец
                    <input
                      type="date"
                      value={rangeDraftEnd}
                      onChange={event => setRangeDraftEnd(event.target.value)}
                      className="mt-1 w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm text-[#0f172a]"
                    />
                  </label>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowDateFlyout(false)}
                    className="rounded-lg border border-[#d7e0ea] px-3 py-2 text-xs font-medium text-[#475569] transition-colors hover:bg-[#f8fafc]"
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={applyCustomRange}
                    className="rounded-lg border border-[#0a58ca] bg-[#0d6efd] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0b5ed7]"
                  >
                    Применить
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="inline-flex rounded-md border border-[#cbd5e1] bg-white p-1">
            {zoomItems.map(item => (
              <button
                key={item.value}
                onClick={() => resetTimelineWindow(undefined, item.value)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  zoom === item.value
                    ? 'bg-[#e7f1ff] text-[#084298]'
                    : 'text-[#556579] hover:bg-[#f8fafc]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="w-[140px]">
            <Select
              options={groupByItems.map(item => ({ value: item.value, label: `Группа: ${item.label}` }))}
              value={groupBy}
              onChange={event => handleGroupByChange(event.target.value as GroupByMode)}
            />
          </div>

          {groupBy !== 'sku' ? (
            <div className="w-[180px]">
              <Select
                options={[{ value: '', label: 'Корень: все категории' }, ...categoryOptions.slice(1)]}
                value={categoryFilter}
                onChange={event => setCategoryFilter(event.target.value)}
              />
            </div>
          ) : null}

          <div ref={filterFlyoutRef} className="relative z-[260]">
            <button
              onClick={() => setShowFilterFlyout(current => !current)}
              className={`${TOOLBAR_BUTTON_CLASS} text-[#495057]`}
            >
              <Filter size={14} />
              Фильтры
              {activeFilterCount > 0 ? <Badge variant="blue">{activeFilterCount}</Badge> : null}
            </button>

            {showFilterFlyout ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-[300] w-[340px] rounded-lg border border-[#cbd5e1] bg-white p-4 shadow-[0_10px_30px_rgba(18,38,63,0.12)]">
                <FilterPanel
                  search={search}
                  statusFilter={statusFilter}
                  categoryFilter={categoryFilter}
                  locationFilter={locationFilter}
                  activeOnly={activeOnly}
                  hideEmptyResources={hideEmptyResources}
                  categoryOptions={categoryOptions}
                  locationOptions={locationOptions}
                  onSearchChange={setSearch}
                  onStatusChange={setStatusFilter}
                  onCategoryChange={setCategoryFilter}
                  onLocationChange={setLocationFilter}
                  onActiveOnlyChange={setActiveOnly}
                  onHideEmptyResourcesChange={setHideEmptyResources}
                  onClear={clearFilters}
                />
              </div>
            ) : null}
          </div>

          <button
            onClick={() => setShowMinimap(current => !current)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              showMinimap
                ? 'border-[#b6d4fe] bg-[#e7f1ff] text-[#084298]'
                : 'border-[#cbd5e1] bg-white text-[#495057] hover:bg-[#f8fafc]'
            }`}
          >
            Миникарта
          </button>

          <button
            onClick={() => {
              const startMs = snapDate(rangeStart.getTime(), zoomConfig[zoom].stepMinutes);
              setDraftSeed({
                rowId: rowDefinitions.find(row => row.isBookable)?.id || 'resource:res-001',
                resourceId: rowDefinitions.find(row => row.resourceId)?.resourceId || 'res-001',
                startMs,
                endMs: startMs + defaultCreateDurationMinutes(zoom) * 60_000,
              });
              setDraftName('');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-md border border-[#0a58ca] bg-[#0d6efd] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0b5ed7]"
          >
            <Plus size={14} />
            Новая бронь
          </button>
        </div>

        <button
          onClick={() => setShowFilterModal(true)}
          className="inline-flex items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#495057] transition-colors hover:bg-[#f8fafc] lg:hidden"
        >
          <Filter size={14} />
          Фильтры
        </button>
      </>
    ),
    [
      activeFilterCount,
      activeOnly,
      categoryFilter,
      categoryOptions,
      hideEmptyResources,
      locationFilter,
      locationOptions,
      groupBy,
      rangeEnd,
      rangeDraftEnd,
      rangeDraftStart,
      rangeStart,
      rowDefinitions,
      search,
      showDateFlyout,
      showMinimap,
      showFilterFlyout,
      showViewFlyout,
      statusFilter,
      viewMode,
      zoom,
    ]
  );

  useEffect(() => {
    onHeaderActionsChange?.(headerActions);
    return () => onHeaderActionsChange?.(null);
  }, [headerActions, onHeaderActionsChange]);

  return (
    <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-hidden">
        {viewMode === 'timeline' ? (
          <TimelineScheduler
            rows={rowDefinitions}
            rowLayouts={rowLayouts}
            ticks={timelineTicks}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            leftWidth={leftWidth}
            canvasWidth={canvasWidth}
            pixelsPerMinute={pixelsPerMinute}
            nowX={nowX}
            draftBookingMap={draftBookingMap}
            scrollRef={scrollRef}
            initialScrollLeft={initialScrollLeft}
            resetKey={timelineResetKey}
            showMinimap={showMinimap}
            onShowMinimapChange={setShowMinimap}
            resourceFilterOptions={resourceFilterOptions}
            selectedResourceIds={selectedResourceIds}
            onToggleResourceSelection={toggleResourceSelection}
            onSelectAllResources={toggleAllVisibleResources}
            onClearResourceSelections={() => {
              setDrilldownResourceIds(null);
              setSelectedResourceIds([]);
            }}
            onFocusRow={row => {
              if (row.type === 'category') {
                const categoryResourceIds = mockResources
                  .filter(resource => resource.categoryName === row.categoryName)
                  .map(resource => resource.id);
                setGroupBy('resource');
                setCategoryFilter(row.categoryName);
                setFocusedResourceId('');
                setFocusedVariantId('');
                setDrilldownResourceIds(categoryResourceIds);
                return;
              }

              if (row.type === 'resource' && row.resourceId) {
                const resourceId = row.resourceId;
                setGroupBy('sku');
                setCategoryFilter(row.categoryName);
                setFocusedResourceId(resourceId);
                setFocusedVariantId('');
                setDrilldownResourceIds([resourceId]);
                return;
              }

              if (row.type === 'variant' && row.variantId) {
                const variantId = row.variantId;
                setGroupBy('sku');
                setFocusedVariantId(variantId);
                setFocusedResourceId(row.resourceId || '');
                if (row.resourceId) {
                  setDrilldownResourceIds([row.resourceId]);
                }
              }
            }}
            onExtendLeft={() => {
              setWindowStartBlocks(current => current - WINDOW_EXTEND_BLOCKS);
              setWindowBlockCount(current => current + WINDOW_EXTEND_BLOCKS);
            }}
            onExtendRight={() => {
              setWindowBlockCount(current => current + WINDOW_EXTEND_BLOCKS);
            }}
            onSelectBooking={bookingId => setSelectedBookingId(bookingId)}
            onOpenSegmentDetails={segment => setStackedSegmentDetail(segment)}
            onStartInteraction={(bookingId, mode, rowId, pointerStartX) => {
              const booking = bookingRecords.find(item => item.id === bookingId);
              if (!booking) {
                return;
              }

              setInteraction({
                bookingId,
                mode,
                originRowId: rowId,
                draftRowId: rowId,
                originStartMs: booking.startMs,
                originEndMs: booking.endMs,
                pointerStartX,
              });
            }}
            onCreateSeed={seed => {
              setDraftSeed(seed);
              setDraftName('');
              setShowCreateModal(true);
            }}
          />
        ) : (
          <SchedulerPlaceholder viewMode={viewMode} />
        )}
      </div>

      <Modal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Фильтры"
        size="sm"
      >
        <FilterPanel
          search={search}
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          locationFilter={locationFilter}
          activeOnly={activeOnly}
          hideEmptyResources={hideEmptyResources}
          categoryOptions={categoryOptions}
          locationOptions={locationOptions}
          onSearchChange={setSearch}
          onStatusChange={setStatusFilter}
          onCategoryChange={setCategoryFilter}
          onLocationChange={setLocationFilter}
          onActiveOnlyChange={setActiveOnly}
          onHideEmptyResourcesChange={setHideEmptyResources}
          onClear={() => {
            clearFilters();
            setShowFilterModal(false);
          }}
        />
      </Modal>

      <Modal
        open={showCreateModal && Boolean(draftSeed)}
        onClose={() => setShowCreateModal(false)}
        title="Новая бронь"
        size="md"
      >
        {draftSeed ? (
          <CreateBookingForm
            draftName={draftName}
            seed={draftSeed}
            rowLookup={rowLookup}
            resourceLookup={resourceLookup}
            variantLookup={variantLookup}
            onNameChange={setDraftName}
            onCancel={() => setShowCreateModal(false)}
            onCreate={() => {
              const row = rowLookup.get(draftSeed.rowId);
              if (!row || !row.resourceId) {
                return;
              }

              const resource = resourceLookup.get(row.resourceId);
              const variant = row.variantId ? variantLookup.get(row.variantId) : undefined;
              if (!resource) {
                return;
              }

              const nextId = `bk-${String(bookings.length + 1).padStart(3, '0')}`;
              const nextRef = `SGH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(bookings.length + 1).padStart(3, '0')}`;

              setBookings(current => [
                ...current,
                {
                  id: nextId,
                  ref: nextRef,
                  status: 'pending',
                  customer: {
                    id: `c-${String(current.length + 1).padStart(3, '0')}`,
                    name: draftName || 'Клиент без записи',
                    email: 'pending@example.com',
                  },
                  selection: {
                    offerId: 'off-manual',
                    offerTitle: 'Ручная бронь',
                    resourceId: resource.id,
                    resourceTitle: resource.title,
                    variantId: variant?.id,
                    variantTitle: variant?.title,
                    quantity: 1,
                    startDate: new Date(draftSeed.startMs).toISOString(),
                    endDate: new Date(draftSeed.endMs).toISOString(),
                    durationLabel: formatDurationLabel(draftSeed.startMs, draftSeed.endMs),
                  },
                  totalAmount: 0,
                  currency: 'RUB',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ]);
              setShowCreateModal(false);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(stackedSegmentDetail)}
        onClose={() => setStackedSegmentDetail(null)}
        title={stackedSegmentDetail ? `Занятые единицы • ${stackedSegmentDetail.rowLabel}` : 'Занятые единицы'}
        size="lg"
      >
        {stackedSegmentDetail ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#d7e0ea] bg-[#f8fbff] px-3 py-2 text-xs text-[#475569]">
              <p className="font-semibold text-[#334155]">
                Забронировано единиц: {stackedSegmentDetail.unitCount}
              </p>
              <p className="mt-1">
                {formatDateTime(stackedSegmentDetail.startMs)} - {formatDateTime(stackedSegmentDetail.endMs)}
              </p>
            </div>

            <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
              {stackedSegmentBookings.map(booking => {
                const status = statusBadge[booking.status];
                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => {
                      setSelectedBookingId(booking.id);
                      setStackedSegmentDetail(null);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#d7e0ea] bg-white px-3 py-2 text-left transition-colors hover:bg-[#f8fbff]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1f2d3d]">{booking.ref}</p>
                      <p className="truncate text-xs text-[#64748b]">{booking.customer.name}</p>
                      <p className="truncate text-xs text-[#64748b]">{formatTimeRangeMs(booking.startMs, booking.endMs)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <p className="mt-1 text-[11px] text-[#64748b]">кол-во: {booking.selection.quantity}</p>
                    </div>
                  </button>
                );
              })}
              {stackedSegmentBookings.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#94a3b8]">В этом сегменте броней нет.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <BookingDrawer booking={selectedBooking} onClose={() => setSelectedBookingId(null)} />
    </div>
  );
}

function TimelineScheduler({
  rows,
  rowLayouts,
  ticks,
  rangeStart,
  rangeEnd,
  leftWidth,
  canvasWidth,
  pixelsPerMinute,
  nowX,
  draftBookingMap,
  scrollRef,
  initialScrollLeft,
  resetKey,
  showMinimap,
  onShowMinimapChange,
  resourceFilterOptions,
  selectedResourceIds,
  onToggleResourceSelection,
  onSelectAllResources,
  onClearResourceSelections,
  onFocusRow,
  onExtendLeft,
  onExtendRight,
  onSelectBooking,
  onOpenSegmentDetails,
  onStartInteraction,
  onCreateSeed,
}: {
  rows: TimelineRow[];
  rowLayouts: Record<string, { bookings: PositionedBooking[]; laneCount: number }>;
  ticks: TimelineTick[];
  rangeStart: Date;
  rangeEnd: Date;
  leftWidth: number;
  canvasWidth: number;
  pixelsPerMinute: number;
  nowX: number | null;
  draftBookingMap: Record<string, { rowId: string; startMs: number; endMs: number }>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  initialScrollLeft: number;
  resetKey: number;
  showMinimap: boolean;
  onShowMinimapChange: (value: boolean) => void;
  resourceFilterOptions: Array<{
    id: string;
    title: string;
    status: Resource['status'];
    categoryName: string;
    imageUrl?: string;
    variantCount: number;
  }>;
  selectedResourceIds: string[];
  onToggleResourceSelection: (resourceId: string) => void;
  onSelectAllResources: () => void;
  onClearResourceSelections: () => void;
  onFocusRow: (row: TimelineRow) => void;
  onExtendLeft: () => void;
  onExtendRight: () => void;
  onSelectBooking: (bookingId: string) => void;
  onOpenSegmentDetails: (segment: {
    rowLabel: string;
    startMs: number;
    endMs: number;
    unitCount: number;
    bookingIds: string[];
  }) => void;
  onStartInteraction: (bookingId: string, mode: 'move', rowId: string, pointerStartX: number) => void;
  onCreateSeed: (seed: DraftBookingSeed) => void;
}) {
  const extendLockRef = useRef<'left' | 'right' | null>(null);
  const pendingExtendRef = useRef<'left' | 'right' | null>(null);
  const previousCanvasWidthRef = useRef(canvasWidth);
  const minimapTrackRef = useRef<HTMLDivElement | null>(null);
  const resourceFlyoutRef = useRef<HTMLDivElement | null>(null);
  const minimapDragRef = useRef<{ mode: 'viewport' | 'pan'; pointerOffsetX: number } | null>(null);
  const [showResourceFlyout, setShowResourceFlyout] = useState(false);
  const [resourceFlyoutSearch, setResourceFlyoutSearch] = useState('');
  const [minimapMenu, setMinimapMenu] = useState<{ x: number; y: number } | null>(null);
  const [viewportMetrics, setViewportMetrics] = useState({
    scrollLeft: initialScrollLeft,
    clientWidth: 0,
    scrollWidth: leftWidth + canvasWidth,
  });

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }
    node.scrollLeft = initialScrollLeft;
    extendLockRef.current = null;
    pendingExtendRef.current = null;
    previousCanvasWidthRef.current = canvasWidth;
    setViewportMetrics({
      scrollLeft: initialScrollLeft,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    });
  }, [initialScrollLeft, resetKey, scrollRef]);

  useLayoutEffect(() => {
    const previousCanvasWidth = previousCanvasWidthRef.current;
    const widthDelta = canvasWidth - previousCanvasWidth;
    previousCanvasWidthRef.current = canvasWidth;

    if (!widthDelta) {
      return;
    }

    const node = scrollRef.current;
    if (!node) {
      extendLockRef.current = null;
      pendingExtendRef.current = null;
      return;
    }

    if (pendingExtendRef.current === 'left') {
      node.scrollLeft += widthDelta;
    }

    extendLockRef.current = null;
    pendingExtendRef.current = null;
  }, [canvasWidth, scrollRef]);

  useEffect(() => {
    const syncViewportMetrics = () => {
      const node = scrollRef.current;
      if (!node) {
        return;
      }

      setViewportMetrics({
        scrollLeft: node.scrollLeft,
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      });
    };

    syncViewportMetrics();
    window.addEventListener('resize', syncViewportMetrics);
    return () => window.removeEventListener('resize', syncViewportMetrics);
  }, [scrollRef, canvasWidth, rows.length]);

  useEffect(() => {
    if (!minimapMenu) {
      return;
    }

    const closeMenu = () => setMinimapMenu(null);
    window.addEventListener('click', closeMenu);
    window.addEventListener('contextmenu', closeMenu);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('contextmenu', closeMenu);
    };
  }, [minimapMenu]);

  useEffect(() => {
    if (!showResourceFlyout) {
      return;
    }

    const closeFlyout = (event: MouseEvent) => {
      if (resourceFlyoutRef.current?.contains(event.target as Node)) {
        return;
      }
      setShowResourceFlyout(false);
    };

    window.addEventListener('mousedown', closeFlyout);
    return () => window.removeEventListener('mousedown', closeFlyout);
  }, [showResourceFlyout]);

  const filteredResourceOptions = useMemo(() => {
    const normalizedQuery = resourceFlyoutSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return resourceFilterOptions;
    }

    return resourceFilterOptions.filter(resource => {
      const summary = `${resource.title} ${resource.categoryName}`.toLowerCase();
      return summary.includes(normalizedQuery);
    });
  }, [resourceFilterOptions, resourceFlyoutSearch]);

  const selectedCount = selectedResourceIds.filter(resourceId =>
    resourceFilterOptions.some(resource => resource.id === resourceId)
  ).length;
  const allVisibleSelected = resourceFilterOptions.length > 0 && selectedCount === resourceFilterOptions.length;

  const minimapWidth = Math.max(viewportMetrics.clientWidth - 32, 320);
  const minimapScale = minimapWidth / Math.max(canvasWidth, 1);
  const minimapViewportWidth = Math.max(
    18,
    Math.min(minimapWidth, ((viewportMetrics.clientWidth - leftWidth) / Math.max(canvasWidth, 1)) * minimapWidth)
  );
  const minimapViewportLeft =
    ((Math.max(viewportMetrics.scrollLeft - leftWidth, 0)) / Math.max(canvasWidth, 1)) * minimapWidth;

  const syncScrollMetrics = (node: HTMLDivElement) => {
    setViewportMetrics({
      scrollLeft: node.scrollLeft,
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    });
  };

  const setTimelineScrollFromMinimap = (nextContentLeft: number) => {
    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const nextScrollLeft = Math.min(
      Math.max(leftWidth + nextContentLeft, 0),
      Math.max(node.scrollWidth - node.clientWidth, 0)
    );

    node.scrollLeft = nextScrollLeft;
    syncScrollMetrics(node);
  };

  return (
    <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden bg-white">
      <div
        ref={scrollRef}
        className="h-full min-h-0 flex-1 overflow-auto overscroll-contain bg-white"
        onScroll={event => {
          const node = event.currentTarget;
          const nextScrollLeft = node.scrollLeft;
          syncScrollMetrics(node);

          const extendThreshold = 240;
          if (nextScrollLeft < extendThreshold && extendLockRef.current !== 'left') {
            extendLockRef.current = 'left';
            pendingExtendRef.current = 'left';
            onExtendLeft();
            return;
          }

          const remainingRight = node.scrollWidth - node.clientWidth - nextScrollLeft;
          if (remainingRight < extendThreshold && extendLockRef.current !== 'right') {
            extendLockRef.current = 'right';
            pendingExtendRef.current = 'right';
            onExtendRight();
          }
        }}
      >
        <div style={{ width: leftWidth + canvasWidth }} className="relative z-0 min-h-full">
          <div
            className="sticky top-0 z-10 grid border-b border-[#d7e0ea] bg-[#f8fbff]"
            style={{ gridTemplateColumns: `${leftWidth}px ${canvasWidth}px` }}
          >
            <div className="sticky left-0 z-10 border-r border-[#d7e0ea] bg-[#f8fbff] px-4 py-1">
              <div className="relative flex items-center justify-between" ref={resourceFlyoutRef}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7a90]">
                    Ресурсы
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResourceFlyout(current => !current)}
                  className="inline-flex items-center gap-1 rounded-md border border-[#d2dbe7] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#526581] transition-colors hover:bg-[#f8fafc]"
                >
                  <Filter size={12} />
                  {allVisibleSelected ? 'Все' : selectedCount}
                </button>

                {showResourceFlyout ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[300px] rounded-xl border border-[#cbd5e1] bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.16)]">
                    <div className="relative">
                      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                      <input
                        type="text"
                        value={resourceFlyoutSearch}
                        onChange={event => setResourceFlyoutSearch(event.target.value)}
                        placeholder="Фильтр ресурсов"
                        className="w-full rounded-md border border-[#cbd5e1] bg-white px-8 py-2 text-xs text-[#0f172a] outline-none transition focus:border-[#86b7fe] focus:ring-2 focus:ring-[#9ec5fe]"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={onSelectAllResources}
                        className="rounded-md border border-[#d7e0ea] px-2 py-1 text-[11px] font-medium text-[#334155] transition-colors hover:bg-[#f8fafc]"
                      >
                        {allVisibleSelected ? 'Снять все' : 'Выбрать все'}
                      </button>
                      <button
                        type="button"
                        onClick={onClearResourceSelections}
                        className="rounded-md border border-[#d7e0ea] px-2 py-1 text-[11px] font-medium text-[#334155] transition-colors hover:bg-[#f8fafc]"
                      >
                        Сбросить
                      </button>
                    </div>
                    <div className="mt-3 max-h-[260px] space-y-1 overflow-auto pr-1">
                      {filteredResourceOptions.map(resource => {
                        const checked = selectedResourceIds.includes(resource.id);
                        return (
                          <label
                            key={resource.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-xs text-[#334155] transition-colors hover:border-[#dbe5f0] hover:bg-[#f8fbff]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleResourceSelection(resource.id)}
                              className="rounded border-[#cbd5e1]"
                            />
                            {resource.imageUrl ? (
                              <img
                                src={resource.imageUrl}
                                alt={resource.title}
                                className="h-7 w-7 rounded object-cover"
                              />
                            ) : (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-[#e2e8f0] text-[10px] font-semibold uppercase text-[#64748b]">
                                {resource.title.slice(0, 2)}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{resource.title}</span>
                              <span className="block truncate text-[10px] text-[#64748b]">
                                {resource.categoryName} · единиц: {resource.variantCount}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                      {filteredResourceOptions.length === 0 ? (
                        <p className="px-2 py-4 text-center text-[11px] text-[#94a3b8]">Подходящих ресурсов нет</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative h-[44px] bg-[#f8fbff]">
              {ticks.map(tick => (
                <div
                  key={tick.key}
                  className={`absolute inset-y-0 border-r ${tick.isMajor ? 'border-[#c7d5e5]' : 'border-[#edf2f7]'}`}
                  style={{ left: (tick.startMs - rangeStart.getTime()) / 60_000 * pixelsPerMinute }}
                >
                  <div className="px-2 pt-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7a90]">
                      {tick.label} {tick.subLabel}
                    </p>
                  </div>
                </div>
              ))}
              {nowX !== null ? (
                <div
                  className="absolute bottom-0 top-0 z-10 w-px bg-[#dc2626]"
                  style={{ left: nowX }}
                >
                  <div className="absolute left-1 top-1 rounded bg-[#dc2626] px-1 py-0.5 text-[9px] font-semibold text-white">
                    Сейчас
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {rows.map(row => (
            <SchedulerRow
              key={row.id}
              row={row}
              rowLayout={rowLayouts[row.id] || { bookings: [], laneCount: 0 }}
              leftWidth={leftWidth}
              canvasWidth={canvasWidth}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              pixelsPerMinute={pixelsPerMinute}
              ticks={ticks}
              draftBookingMap={draftBookingMap}
              onFocusRow={onFocusRow}
              onSelectBooking={onSelectBooking}
              onOpenSegmentDetails={onOpenSegmentDetails}
              onStartInteraction={onStartInteraction}
              onCreateSeed={onCreateSeed}
            />
          ))}

          {rows.length === 0
            ? Array.from({ length: 8 }).map((_, index) => (
                <BlankSchedulerRow
                  key={`blank-row-${index}`}
                  leftWidth={leftWidth}
                  canvasWidth={canvasWidth}
                  pixelsPerMinute={pixelsPerMinute}
                  ticks={ticks}
                />
              ))
            : null}
        </div>
      </div>

      {showMinimap ? (
        <div className="relative border-t border-[#d7e0ea] bg-[#f8fbff] px-4 py-2">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b7a90]">Миникарта таймлайна</p>
            <button
              onClick={() => onShowMinimapChange(false)}
              className="text-[10px] font-medium text-[#64748b] transition-colors hover:text-[#1f2d3d]"
            >
              Скрыть
            </button>
          </div>
          <div
            ref={minimapTrackRef}
            onContextMenu={event => {
              event.preventDefault();
              setMinimapMenu({ x: event.clientX, y: event.clientY });
            }}
            onClick={event => {
              if ((event.target as HTMLElement).dataset.minimapViewport === 'true') {
                return;
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
              const contentLeft = (relativeX / Math.max(minimapWidth, 1)) * canvasWidth;
              setTimelineScrollFromMinimap(contentLeft - (viewportMetrics.clientWidth - leftWidth) / 2);
            }}
            onWheel={event => {
              const delta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.shiftKey ? event.deltaY : 0;
              if (!delta) {
                return;
              }
              event.preventDefault();
              const node = scrollRef.current;
              if (!node) {
                return;
              }
              node.scrollLeft += delta;
              syncScrollMetrics(node);
            }}
            onPointerDown={event => {
              if ((event.target as HTMLElement).dataset.minimapViewport === 'true') {
                return;
              }
              minimapDragRef.current = { mode: 'pan', pointerOffsetX: event.clientX };
              (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
              if (minimapDragRef.current?.mode !== 'pan') {
                return;
              }
              const deltaX = event.clientX - minimapDragRef.current.pointerOffsetX;
              minimapDragRef.current.pointerOffsetX = event.clientX;
              const contentDelta = (deltaX / Math.max(minimapWidth, 1)) * canvasWidth;
              const node = scrollRef.current;
              if (!node) {
                return;
              }
              node.scrollLeft = Math.min(
                Math.max(node.scrollLeft + contentDelta, 0),
                Math.max(node.scrollWidth - node.clientWidth, 0)
              );
              syncScrollMetrics(node);
            }}
            onPointerUp={() => {
              minimapDragRef.current = null;
            }}
            onPointerCancel={() => {
              minimapDragRef.current = null;
            }}
            className="relative h-12 w-full overflow-hidden rounded-md border border-[#d7e0ea] bg-white"
          >
            {rows
              .filter(row => row.bookingCount > 0)
              .slice(0, 18)
              .map((row, index) => {
                const rowBookings = rowLayouts[row.id]?.bookings || [];
                const top = 4 + index * 2;
                return (
                  <div key={row.id} className="absolute left-0 right-0" style={{ top, height: 2 }}>
                    {rowBookings.map(booking => {
                      const placement = getPlacement(
                        booking.startMs,
                        booking.endMs,
                        rangeStart.getTime(),
                        rangeEnd.getTime(),
                        pixelsPerMinute
                      );
                      if (!placement) {
                        return null;
                      }

                      return (
                        <div
                          key={booking.id}
                          className={`absolute h-full rounded-full ${booking.hasConflict ? 'bg-[#dc2626]' : 'bg-[#3b82f6]'}`}
                          style={{
                            left: placement.left * minimapScale,
                            width: Math.max(2, placement.width * minimapScale),
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}

            <div
              data-minimap-viewport="true"
              onPointerDown={event => {
                event.stopPropagation();
                minimapDragRef.current = {
                  mode: 'viewport',
                  pointerOffsetX: event.clientX - minimapViewportLeft,
                };
                (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
              }}
              onPointerMove={event => {
                if (minimapDragRef.current?.mode !== 'viewport') {
                  return;
                }
                const relativeLeft = Math.min(
                  Math.max(event.clientX - minimapDragRef.current.pointerOffsetX, 0),
                  Math.max(minimapWidth - minimapViewportWidth, 0)
                );
                const contentLeft = (relativeLeft / Math.max(minimapWidth, 1)) * canvasWidth;
                setTimelineScrollFromMinimap(contentLeft);
              }}
              onPointerUp={() => {
                minimapDragRef.current = null;
              }}
              onPointerCancel={() => {
                minimapDragRef.current = null;
              }}
              className="absolute bottom-0 top-0 z-10 cursor-grab rounded border border-[#0d6efd] bg-[#0d6efd]/10 active:cursor-grabbing"
              style={{
                left: minimapViewportLeft,
                width: minimapViewportWidth,
              }}
            />
          </div>

          {minimapMenu ? (
            <div
              className="fixed z-50 min-w-[140px] rounded-md border border-[#d7e0ea] bg-white p-1 shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
              style={{ left: minimapMenu.x, top: minimapMenu.y }}
            >
              <button
                onClick={() => {
                  onShowMinimapChange(false);
                  setMinimapMenu(null);
                }}
                className="flex w-full items-center rounded px-3 py-2 text-left text-xs font-medium text-[#334155] transition-colors hover:bg-[#f1f5f9]"
              >
                Скрыть миникарту
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SchedulerRow({
  row,
  rowLayout,
  leftWidth,
  canvasWidth,
  rangeStart,
  rangeEnd,
  pixelsPerMinute,
  ticks,
  draftBookingMap,
  onFocusRow,
  onSelectBooking,
  onOpenSegmentDetails,
  onStartInteraction,
  onCreateSeed,
}: {
  row: TimelineRow;
  rowLayout: { bookings: PositionedBooking[]; laneCount: number };
  leftWidth: number;
  canvasWidth: number;
  rangeStart: Date;
  rangeEnd: Date;
  pixelsPerMinute: number;
  ticks: TimelineTick[];
  draftBookingMap: Record<string, { rowId: string; startMs: number; endMs: number }>;
  onFocusRow: (row: TimelineRow) => void;
  onSelectBooking: (bookingId: string) => void;
  onOpenSegmentDetails: (segment: {
    rowLabel: string;
    startMs: number;
    endMs: number;
    unitCount: number;
    bookingIds: string[];
  }) => void;
  onStartInteraction: (bookingId: string, mode: 'move', rowId: string, pointerStartX: number) => void;
  onCreateSeed: (seed: DraftBookingSeed) => void;
}) {
  const tickSpacingPx = getTickSpacingPx(ticks, pixelsPerMinute);
  const occupancySegments =
    row.type === 'resource' || row.type === 'variant'
      ? buildOccupancySegments(rowLayout.bookings, row.capacity || 1, rangeStart.getTime(), rangeEnd.getTime())
      : [];
  const resourceTrackHeight = getResourceTrackHeight(row.capacity || 1);
  const rowHeight =
    row.type === 'category'
      ? 44
      : row.type === 'resource' || row.type === 'variant'
        ? resourceTrackHeight + 2
        : Math.max(60, 18 + Math.max(1, rowLayout.laneCount || 1) * 32);

  return (
    <div
      className="grid border-b border-[#edf2f7]"
      style={{ gridTemplateColumns: `${leftWidth}px ${canvasWidth}px`, minHeight: rowHeight }}
    >
      <div
        className={`sticky left-0 z-[6] border-r border-[#e2e8f0] px-4 ${
          row.type === 'category' ? 'bg-[#f8fbff]' : 'bg-white'
        } cursor-pointer transition-colors hover:bg-[#f8fbff]`}
        onClick={() => onFocusRow(row)}
      >
        <div className="flex h-full items-start gap-2 py-1">
          {row.type === 'category' ? (
            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#3b82f6]" />
          ) : row.imageUrl ? (
            <img src={row.imageUrl} alt={row.label} className="h-9 w-9 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#e2e8f0] text-xs font-semibold uppercase text-[#64748b]">
              {row.label.slice(0, 2)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={`truncate ${row.type === 'category' ? 'text-xs font-semibold uppercase tracking-[0.16em] text-[#526581]' : 'text-sm font-medium text-gray-900'}`}>
                {row.label}
              </p>
              {row.type !== 'category' ? <ResourceStatusDot status={row.status} /> : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#64748b]">
              <span>{row.meta}</span>
              {row.sku ? (
                <>
                  <span className="text-[#c0cad6]">•</span>
                  <span className="rounded bg-[#eef2ff] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#3b4c8a]">
                    {row.sku}
                  </span>
                </>
              ) : null}
              <span className="text-[#c0cad6]">•</span>
              <span>Броней: {row.bookingCount}</span>
            </div>
          </div>

          <div className="w-14 shrink-0 text-right">
            <p className="text-xs font-semibold text-[#1f2d3d]">{row.utilization}%</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Загр.</p>
          </div>
        </div>
      </div>

      <div
        data-scheduler-row-id={row.id}
        className={`relative ${row.type === 'category' ? 'bg-[#fbfdff]' : 'bg-white'}`}
        style={{
          backgroundImage: `repeating-linear-gradient(
            to right,
            transparent 0,
            transparent ${Math.max(tickSpacingPx - 1, 1)}px,
            #eff4f8 ${Math.max(tickSpacingPx - 1, 1)}px,
            #eff4f8 ${Math.max(tickSpacingPx, 2)}px
          )`,
        }}
        onDoubleClick={event => {
          if (!row.isBookable) {
            return;
          }

          const target = event.currentTarget.getBoundingClientRect();
          const localX = event.clientX - target.left;
          const startMs = snapDate(rangeStart.getTime() + localX / pixelsPerMinute * 60_000, 30);
          const endMs = startMs + defaultCreateDurationMinutes('day') * 60_000;
          onCreateSeed({
            rowId: row.id,
            resourceId: row.resourceId || 'res-001',
            variantId: row.variantId,
            startMs,
            endMs,
          });
        }}
      >
        {row.type !== 'category' && !row.isBookable ? (
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#f3f4f6,#f3f4f6_12px,#e5e7eb_12px,#e5e7eb_24px)] opacity-50" />
        ) : null}

        <div className={`relative h-full px-1 ${row.type === 'resource' ? 'py-0' : 'py-1'}`}>
          {row.type === 'resource' || row.type === 'variant' ? (
            <ResourceOccupancyTrack
              row={row}
              segments={occupancySegments}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              pixelsPerMinute={pixelsPerMinute}
              onOpenSegmentDetails={onOpenSegmentDetails}
            />
          ) : (
            rowLayout.bookings.map(booking => {
              const draft = draftBookingMap[booking.id];
              const startMs = draft?.startMs ?? booking.startMs;
              const endMs = draft?.endMs ?? booking.endMs;
              const draftRowId = draft?.rowId ?? booking.rowId;
              const placement = getPlacement(startMs, endMs, rangeStart.getTime(), rangeEnd.getTime(), pixelsPerMinute);
              if (!placement || draftRowId !== row.id) {
                return null;
              }

              const top = 6 + booking.lane * 32;
              return (
                <BookingBar
                  key={booking.id}
                  booking={booking}
                  top={top}
                  left={placement.left}
                  width={placement.width}
                  isDraft={Boolean(draft)}
                  onSelect={() => onSelectBooking(booking.id)}
                  onMoveStart={row.isBookable ? event => onStartInteraction(booking.id, 'move', row.id, event.clientX) : undefined}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceOccupancyTrack({
  row,
  segments,
  rangeStart,
  rangeEnd,
  pixelsPerMinute,
  onOpenSegmentDetails,
}: {
  row: TimelineRow;
  segments: OccupancySegment[];
  rangeStart: Date;
  rangeEnd: Date;
  pixelsPerMinute: number;
  onOpenSegmentDetails: (segment: {
    rowLabel: string;
    startMs: number;
    endMs: number;
    unitCount: number;
    bookingIds: string[];
  }) => void;
}) {
  const capacity = Math.max(row.capacity || 1, 1);

  return (
    <div className="relative h-full">
      <div
        className="absolute inset-y-0 left-2 right-2 overflow-hidden rounded-lg border border-[#dbe5f0] bg-[#f8fbff]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to top,
            transparent 0,
            transparent ${Math.max(RESOURCE_UNIT_STACK_HEIGHT - 1, 1)}px,
            #dbe5f0 ${Math.max(RESOURCE_UNIT_STACK_HEIGHT - 1, 1)}px,
            #dbe5f0 ${RESOURCE_UNIT_STACK_HEIGHT}px
          )`,
        }}
      >
        {segments.map(segment => {
          const placement = getPlacement(
            segment.startMs,
            segment.endMs,
            rangeStart.getTime(),
            rangeEnd.getTime(),
            pixelsPerMinute
          );
          if (!placement) {
            return null;
          }

          const canLabel = placement.width >= 58;
          const visibleUnitCount = Math.min(segment.unitCount, capacity);

          return (
            <button
              key={segment.key}
              type="button"
              onClick={() =>
                onOpenSegmentDetails({
                  rowLabel: row.label,
                  startMs: segment.startMs,
                  endMs: segment.endMs,
                  unitCount: segment.unitCount,
                  bookingIds: segment.bookingIds,
                })
              }
              className={`absolute inset-y-0 z-[8] overflow-hidden border-r text-left hover:z-[12] ${
                segment.hasConflict
                  ? 'border-[#dc2626] bg-[#fff1f2] text-[#991b1b]'
                  : 'border-[#cfe2ff] bg-[#f8fbff] text-[#1e3a8a]'
              }`}
              style={{
                left: placement.left,
                width: Math.max(placement.width, 8),
              }}
              title={`Забронировано единиц: ${segment.unitCount} · ${formatDateTime(segment.startMs)} - ${formatDateTime(segment.endMs)}`}
            >
              <div className="absolute inset-0 flex flex-col-reverse">
                {Array.from({ length: visibleUnitCount }, (_, index) => (
                  <div
                    key={`${segment.key}-unit-${index}`}
                    className={`border-t ${
                      segment.hasConflict
                        ? 'border-[#fecaca] bg-[#f87171]/85'
                        : 'border-[#bfdbfe] bg-[#60a5fa]/85'
                    }`}
                    style={{ height: RESOURCE_UNIT_STACK_HEIGHT }}
                  />
                ))}
              </div>

              {segment.unitCount > capacity ? (
                <div className="absolute inset-x-0 top-0 z-[14] h-1 bg-[#dc2626]" />
              ) : null}

              {canLabel ? (
                <span className="pointer-events-none absolute left-2 top-1 z-[20] truncate rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.16)]">
                  {segment.unitCount} ед.
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BlankSchedulerRow({
  leftWidth,
  canvasWidth,
  pixelsPerMinute,
  ticks,
}: {
  leftWidth: number;
  canvasWidth: number;
  pixelsPerMinute: number;
  ticks: TimelineTick[];
}) {
  const tickSpacingPx = getTickSpacingPx(ticks, pixelsPerMinute);
  return (
    <div
      className="grid border-b border-[#edf2f7]"
      style={{ gridTemplateColumns: `${leftWidth}px ${canvasWidth}px`, minHeight: 72 }}
    >
      <div className="sticky left-0 z-[6] border-r border-[#e2e8f0] bg-[#fbfdff] px-4" />
      <div
        className="relative bg-white"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to right,
            transparent 0,
            transparent ${Math.max(tickSpacingPx - 1, 1)}px,
            #eff4f8 ${Math.max(tickSpacingPx - 1, 1)}px,
            #eff4f8 ${Math.max(tickSpacingPx, 2)}px
          )`,
        }}
      />
    </div>
  );
}

function BookingBar({
  booking,
  top,
  left,
  width,
  isDraft,
  onSelect,
  onMoveStart,
}: {
  booking: PositionedBooking;
  top: number;
  left: number;
  width: number;
  isDraft: boolean;
  onSelect: () => void;
  onMoveStart?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const status = booking.hasConflict ? { label: 'Конфликт', variant: 'red' as const } : statusBadge[booking.status];
  const barClass = statusBarClass(status.variant, booking.hasConflict);

  return (
    <button
      onClick={onSelect}
      onPointerDown={event => onMoveStart?.(event)}
      className={`absolute flex h-[30px] items-center overflow-hidden rounded-md border px-2 text-left shadow-sm ${barClass} ${
        isDraft ? 'opacity-80 ring-2 ring-[#0d6efd]/30' : ''
      }`}
      style={{ top, left, width: Math.max(width, 36) }}
      title={`${booking.customer.name} · ${formatDateTime(booking.startMs)} - ${formatDateTime(booking.endMs)}`}
    >
      <GripVertical size={10} className="mr-1 shrink-0 opacity-50" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold">{booking.customer.name}</p>
        <p className="truncate text-[10px] opacity-80">{formatTimeRangeMs(booking.startMs, booking.endMs)}</p>
      </div>
    </button>
  );
}

function FilterPanel({
  search,
  statusFilter,
  categoryFilter,
  locationFilter,
  activeOnly,
  hideEmptyResources,
  categoryOptions,
  locationOptions,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onLocationChange,
  onActiveOnlyChange,
  onHideEmptyResourcesChange,
  onClear,
}: {
  search: string;
  statusFilter: string;
  categoryFilter: string;
  locationFilter: string;
  activeOnly: boolean;
  hideEmptyResources: boolean;
  categoryOptions: { value: string; label: string }[];
  locationOptions: { value: string; label: string }[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onActiveOnlyChange: (value: boolean) => void;
  onHideEmptyResourcesChange: (value: boolean) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="Поиск брони или клиента"
          className="w-full rounded-md border border-[#cbd5e1] bg-white px-9 py-2 text-sm text-gray-900 outline-none transition focus:border-[#86b7fe] focus:ring-2 focus:ring-[#9ec5fe]"
        />
      </div>
      <Select options={categoryOptions} value={categoryFilter} onChange={event => onCategoryChange(event.target.value)} />
      <Select options={locationOptions} value={locationFilter} onChange={event => onLocationChange(event.target.value)} />
      <Select options={statusOptions} value={statusFilter} onChange={event => onStatusChange(event.target.value)} />
      <label className="flex items-center justify-between rounded-md border border-[#d7e0ea] bg-[#f8fbff] px-3 py-2 text-sm text-[#334155]">
        <span>Показывать только активные ресурсы</span>
        <input
          type="checkbox"
          checked={activeOnly}
          onChange={event => onActiveOnlyChange(event.target.checked)}
          className="rounded border-[#cbd5e1]"
        />
      </label>
      <label className="flex items-center justify-between rounded-md border border-[#d7e0ea] bg-[#f8fbff] px-3 py-2 text-sm text-[#334155]">
        <span>Скрывать пустые ресурсы</span>
        <input
          type="checkbox"
          checked={hideEmptyResources}
          onChange={event => onHideEmptyResourcesChange(event.target.checked)}
          className="rounded border-[#cbd5e1]"
        />
      </label>
      <div className="flex justify-end">
        <button
          onClick={onClear}
          className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#495057] transition-colors hover:bg-[#f8fafc]"
        >
          Сбросить фильтры
        </button>
      </div>
    </div>
  );
}

function CreateBookingForm({
  seed,
  draftName,
  rowLookup,
  resourceLookup,
  variantLookup,
  onNameChange,
  onCancel,
  onCreate,
}: {
  seed: DraftBookingSeed;
  draftName: string;
  rowLookup: Map<string, TimelineRow>;
  resourceLookup: Map<string, Resource>;
  variantLookup: Map<string, ResourceVariant>;
  onNameChange: (value: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const row = rowLookup.get(seed.rowId);
  const resource = row?.resourceId ? resourceLookup.get(row.resourceId) : null;
  const variant = row?.variantId ? variantLookup.get(row.variantId) : null;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Имя клиента</label>
        <input
          type="text"
          value={draftName}
          onChange={event => onNameChange(event.target.value)}
          placeholder="Клиент"
          className="w-full rounded-md border border-[#cbd5e1] px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#86b7fe] focus:ring-2 focus:ring-[#9ec5fe]"
        />
      </div>
      <div className="grid gap-3 rounded-lg border border-[#d7e0ea] bg-[#f8fbff] p-4 text-sm text-[#334155]">
        <div className="flex justify-between gap-4">
          <span className="text-xs text-[#64748b]">Ресурс</span>
          <span className="text-right font-medium">
            {resource?.title}
            {variant ? ` · ${variant.title}` : ''}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-[#64748b]">Начало</span>
          <span className="text-right font-medium">{formatDateTime(seed.startMs)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-xs text-[#64748b]">Конец</span>
          <span className="text-right font-medium">{formatDateTime(seed.endMs)}</span>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#495057] transition-colors hover:bg-[#f8fafc]"
        >
          Отмена
        </button>
        <button
          onClick={onCreate}
          className="rounded-md border border-[#0a58ca] bg-[#0d6efd] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0b5ed7]"
        >
          Создать бронь
        </button>
      </div>
    </div>
  );
}

function BookingDrawer({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  if (!booking) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-[#1f2d3d]/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[520px] overflow-y-auto border-l border-[#d7e0ea] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#d7e0ea] bg-[#f8fbff] px-5 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Детали брони</p>
            <p className="mt-0.5 text-xs text-gray-500">{booking.ref}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-[#cbd5e1] bg-white p-1.5 text-[#64748b] transition-colors hover:bg-[#f8fafc]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <BookingDetail booking={booking} />
        </div>
      </aside>
    </div>
  );
}

function SchedulerPlaceholder({ viewMode }: { viewMode: Exclude<ViewMode, 'timeline'> }) {
  const copy: Record<Exclude<ViewMode, 'timeline'>, { title: string; text: string }> = {
    calendar: {
      title: 'Календарь как дополнительный вид',
      text: 'Таймлайн сейчас основной рабочий инструмент. Календарь можно добавить как плановый вид поверх того же состояния броней.',
    },
    table: {
      title: 'Таблица как дополнительный вид',
      text: 'Таблица подойдет для аудита и экспорта, а основным инструментом расписания остается таймлайн.',
    },
    kanban: {
      title: 'Канбан как дополнительный вид',
      text: 'Канбан может закрывать работу со статусами броней, не заменяя расписание.',
    },
  };

  return (
    <Card className="m-6">
      <div className="py-16 text-center">
        <h3 className="text-sm font-semibold text-gray-900">{copy[viewMode].title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">{copy[viewMode].text}</p>
      </div>
    </Card>
  );
}

function ResourceStatusDot({ status }: { status: string }) {
  const color = {
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    draft: 'bg-amber-400',
    archived: 'bg-slate-500',
    group: 'bg-blue-500',
  }[status] || 'bg-slate-400';

  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}

function layoutRowBookings(bookings: BookingRecord[]) {
  const sorted = [...bookings].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const lanes: number[] = [];
  const positioned: PositionedBooking[] = sorted.map(booking => {
    let lane = 0;
    while (lanes[lane] && lanes[lane] > booking.startMs) {
      lane += 1;
    }
    lanes[lane] = booking.endMs;
    return { ...booking, lane, hasConflict: false };
  });

  for (let index = 0; index < positioned.length; index += 1) {
    for (let nested = index + 1; nested < positioned.length; nested += 1) {
      if (positioned[nested].startMs >= positioned[index].endMs) {
        break;
      }
      if (positioned[index].startMs < positioned[nested].endMs && positioned[index].endMs > positioned[nested].startMs) {
        positioned[index].hasConflict = true;
        positioned[nested].hasConflict = true;
      }
    }
  }

  return {
    bookings: positioned,
    laneCount: positioned.length ? Math.max(...positioned.map(item => item.lane)) + 1 : 0,
  };
}

function buildTimelineTicks(rangeStart: Date, rangeEnd: Date, zoom: ZoomLevel) {
  const ticks: TimelineTick[] = [];
  const cursor = new Date(rangeStart);

  if (zoom === 'hour') {
    while (cursor < rangeEnd) {
      ticks.push({
        key: cursor.toISOString(),
        label: cursor.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        subLabel: cursor.getHours() === 0 ? cursor.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : undefined,
        startMs: cursor.getTime(),
        isMajor: cursor.getHours() % 6 === 0,
      });
      cursor.setHours(cursor.getHours() + 1);
    }
    return ticks;
  }

  while (cursor < rangeEnd) {
    ticks.push({
      key: cursor.toISOString(),
      label:
        zoom === 'day'
          ? cursor.toLocaleDateString('ru-RU', { weekday: 'short' })
          : cursor.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
      subLabel:
        zoom === 'day'
          ? cursor.toLocaleDateString('ru-RU', { day: '2-digit' })
          : cursor.toLocaleDateString('ru-RU', { weekday: 'short' }),
      startMs: cursor.getTime(),
      isMajor: zoom === 'day' ? cursor.getDay() === 1 : cursor.getDate() === 1 || cursor.getDay() === 1,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return ticks;
}

function computeUtilization(bookings: BookingRecord[], rangeStartMs: number, rangeEndMs: number) {
  const visibleDuration = rangeEndMs - rangeStartMs;
  if (!visibleDuration) {
    return 0;
  }

  const bookedMs = bookings.reduce((sum, booking) => {
    const start = Math.max(booking.startMs, rangeStartMs);
    const end = Math.min(booking.endMs, rangeEndMs);
    return sum + Math.max(0, end - start);
  }, 0);

  return Math.min(100, Math.round((bookedMs / visibleDuration) * 100));
}

function getPlacement(startMs: number, endMs: number, rangeStartMs: number, rangeEndMs: number, pixelsPerMinute: number) {
  if (endMs <= rangeStartMs || startMs >= rangeEndMs) {
    return null;
  }

  const visibleStart = Math.max(startMs, rangeStartMs);
  const visibleEnd = Math.min(endMs, rangeEndMs);

  return {
    left: ((visibleStart - rangeStartMs) / 60_000) * pixelsPerMinute,
    width: Math.max(24, ((visibleEnd - visibleStart) / 60_000) * pixelsPerMinute),
  };
}

function getResourceTrackHeight(capacity: number) {
  return Math.max(RESOURCE_TRACK_BASE_HEIGHT, capacity * RESOURCE_UNIT_STACK_HEIGHT);
}

function getTickSpacingPx(ticks: TimelineTick[], pixelsPerMinute: number) {
  if (ticks.length < 2) {
    return 120;
  }
  const spacingMinutes = (ticks[1].startMs - ticks[0].startMs) / 60_000;
  return Math.max(8, spacingMinutes * pixelsPerMinute);
}

function alignAnchor(date: Date, zoom: ZoomLevel) {
  if (zoom === 'hour') {
    return startOfDay(date);
  }
  if (zoom === 'day') {
    return startOfWeek(date);
  }
  return startOfWeek(date);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const offset = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - offset);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function statusBarClass(variant: 'green' | 'yellow' | 'red' | 'blue' | 'gray', conflict: boolean) {
  if (conflict) {
    return 'border-[#dc2626] bg-[#fee2e2] text-[#991b1b]';
  }

  return {
    green: 'border-[#badbcc] bg-[#e8f7ee] text-[#146c43]',
    yellow: 'border-[#ffecb5] bg-[#fff3cd] text-[#997404]',
    red: 'border-[#f1aeb5] bg-[#f8d7da] text-[#b02a37]',
    blue: 'border-[#b6d4fe] bg-[#e7f1ff] text-[#084298]',
    gray: 'border-[#dee2e6] bg-[#f8f9fa] text-[#495057]',
  }[variant];
}

function getBookingRowId(booking: BookingRecord, groupBy: GroupByMode) {
  if (groupBy === 'activity') {
    const resource = mockResources.find(item => item.id === booking.selection.resourceId);
    return resource ? `category:${resource.categoryId}` : `resource:${booking.selection.resourceId}`;
  }

  if (groupBy === 'sku') {
    if (booking.resolvedVariantId) {
      return `variant:${booking.resolvedVariantId}`;
    }
  }

  return `resource:${booking.selection.resourceId}`;
}

function resolveVariantId(resourceId: string, variantId?: string, variantTitle?: string) {
  if (variantId) {
    return variantId;
  }

  if (!variantTitle) {
    return undefined;
  }

  const normalizedTitle = variantTitle.trim().toLowerCase();
  const match = mockVariants.find(
    variant => variant.resourceId === resourceId && variant.title.trim().toLowerCase() === normalizedTitle
  );
  return match?.id;
}

function buildOccupancySegments(
  bookings: PositionedBooking[],
  capacity: number,
  rangeStartMs: number,
  rangeEndMs: number
) {
  const events = bookings.flatMap(booking => {
    const visibleStart = Math.max(booking.startMs, rangeStartMs);
    const visibleEnd = Math.min(booking.endMs, rangeEndMs);

    if (visibleEnd <= visibleStart) {
      return [];
    }

    const quantity = Math.max(booking.selection.quantity || 1, 1);
    return [
      { time: visibleStart, type: 'start' as const, bookingId: booking.id, quantity, hasConflict: booking.hasConflict },
      { time: visibleEnd, type: 'end' as const, bookingId: booking.id, quantity, hasConflict: booking.hasConflict },
    ];
  });

  const sortedEvents = events.sort((a, b) => {
    if (a.time === b.time) {
      return a.type === 'end' ? -1 : 1;
    }
    return a.time - b.time;
  });

  const active = new Map<string, { quantity: number; hasConflict: boolean }>();
  const segments: OccupancySegment[] = [];

  for (let index = 0; index < sortedEvents.length; index += 1) {
    const event = sortedEvents[index];

    if (event.type === 'end') {
      active.delete(event.bookingId);
    } else {
      active.set(event.bookingId, { quantity: event.quantity, hasConflict: event.hasConflict });
    }

    const nextTime = sortedEvents[index + 1]?.time;
    if (!nextTime || nextTime <= event.time || active.size === 0) {
      continue;
    }

    const bookingIds = Array.from(active.keys());
    const unitCount = Array.from(active.values()).reduce((sum, current) => sum + current.quantity, 0);
    const hasConflict = unitCount > capacity || Array.from(active.values()).some(current => current.hasConflict);

    segments.push({
      key: `${event.time}-${nextTime}-${bookingIds.join('-')}`,
      startMs: event.time,
      endMs: nextTime,
      unitCount,
      bookingIds,
      hasConflict,
    });
  }

  return segments;
}

function snapMinutes(value: number, step: number) {
  return Math.round(value / step) * step;
}

function snapDate(timestampMs: number, stepMinutes: number) {
  const stepMs = stepMinutes * 60_000;
  return Math.round(timestampMs / stepMs) * stepMs;
}

function defaultCreateDurationMinutes(zoom: ZoomLevel) {
  return zoom === 'hour' ? 120 : zoom === 'day' ? 240 : 24 * 60;
}

function formatVisibleRange(start: Date, end: Date) {
  const inclusiveEnd = new Date(end.getTime() - 60_000);
  return `${start.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  })} - ${inclusiveEnd.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
}

function formatDateTime(timestampMs: number) {
  return new Date(timestampMs).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeRangeMs(startMs: number, endMs: number) {
  const start = new Date(startMs).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const end = new Date(endMs).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${start} - ${end}`;
}

function formatDurationLabel(startMs: number, endMs: number) {
  const totalMinutes = Math.round((endMs - startMs) / 60_000);
  if (totalMinutes >= 24 * 60) {
    const days = Math.round(totalMinutes / (24 * 60));
    return `${days} дн.`;
  }
  if (totalMinutes >= 60) {
    const hours = Math.round(totalMinutes / 60);
    return `${hours} ч`;
  }
  return `${totalMinutes} min`;
}
