import { Navigate } from 'react-router-dom';
import { useFeatureFlag } from '@/hooks/useOrgConfig';

interface RequireModuleProps {
  module: string;
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Route guard that checks if a Cosmos module/feature flag is enabled.
 * Redirects to home (or custom path) if the module is disabled.
 */
export function RequireModule({ module, children, redirectTo = '/' }: RequireModuleProps) {
  const isEnabled = useFeatureFlag(module);

  if (!isEnabled) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
