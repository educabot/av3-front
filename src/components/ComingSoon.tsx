import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComingSoonProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function ComingSoon({
  title,
  description = 'Esta seccion aun no esta disponible. El equipo de backend esta trabajando en los endpoints necesarios.',
  backHref = '/',
  backLabel = 'Volver al inicio',
}: ComingSoonProps) {
  return (
    <div className='max-w-xl mx-auto px-6 py-16 text-center'>
      <div className='w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6'>
        <Construction className='w-8 h-8 text-primary' />
      </div>
      <h1 className='title-2-emphasized text-[#10182B] mb-2'>{title}</h1>
      <p className='body-2-regular text-muted-foreground mb-6'>{description}</p>
      <Button asChild variant='outline'>
        <Link to={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}
