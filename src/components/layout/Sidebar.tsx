import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, FileText, BookOpen, LayoutDashboard, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useFeatureFlag } from '@/hooks/useOrgConfig';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: UserRole[];
  module?: string;
}

export function Sidebar({ className }: { className?: string }) {
  const getUserRole = useAuthStore((s) => s.getUserRole);
  const role = getUserRole();
  const location = useLocation();

  const contentEnabled = useFeatureFlag('contenido');
  const planningEnabled = useFeatureFlag('planificacion');

  const items = useMemo(() => {
    const allItems: NavItem[] = [
      { to: '/', icon: <House className="w-5 h-5" />, label: 'Inicio' },
      {
        to: '/',
        icon: <LayoutDashboard className="w-5 h-5" />,
        label: 'Cursos',
        roles: ['coordinator'],
      },
      {
        to: '/',
        icon: <GraduationCap className="w-5 h-5" />,
        label: 'Mis materias',
        roles: ['teacher'],
        module: 'planificacion',
      },
      {
        to: '/',
        icon: <BookOpen className="w-5 h-5" />,
        label: 'Planificacion',
        roles: ['teacher'],
        module: 'planificacion',
      },
      {
        to: '/resources',
        icon: <FileText className="w-5 h-5" />,
        label: 'Recursos',
        module: 'contenido',
      },
    ];

    return allItems.filter((item) => {
      // Role filter
      if (item.roles && role && !item.roles.includes(role)) return false;
      // Feature flag filter
      if (item.module === 'contenido' && !contentEnabled) return false;
      if (item.module === 'planificacion' && !planningEnabled) return false;
      return true;
    });
  }, [role, contentEnabled, planningEnabled]);

  return (
    <nav
      className={cn(
        'w-16 backdrop-blur-sm border-r border-primary/15 flex flex-col items-center py-4',
        className,
      )}
    >
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <li key={item.label}>
              <Link
                to={item.to}
                title={item.label}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-[#000000b3] hover:text-[#324155] hover:bg-gray-100',
                )}
              >
                {item.icon}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
