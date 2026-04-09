export { ScheduleGrid, type ScheduleGridCellContext } from './ScheduleGrid';

// RFC Epic 3 names this badge `SharedClassBadge`; Epic 4 names the same
// component `SharedClassIndicator`. It lives in `coordination/` for historical
// reasons — re-export it here so Epic 3 code can import a single reference
// barrel without duplicating the component.
export { SharedClassIndicator as SharedClassBadge } from '@/components/coordination/SharedClassIndicator';
