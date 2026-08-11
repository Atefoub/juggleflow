import type { ReactNode } from 'react';
import BottomNav from '../BottomNav';
import { STUDENT_NAV_ITEMS } from '../../config/studentNav';

/**
 * Shell élève : colonne mobile élargie progressivement à partir de md.
 * La barre de navigation basse est alignée sur la largeur du contenu.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-primary font-body">
      <div className="mx-auto flex min-h-screen w-full max-w-shell flex-col pb-20 md:max-w-shell-md lg:max-w-shell-lg">
        {children}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30">
        <div className="mx-auto w-full max-w-shell md:max-w-shell-md lg:max-w-shell-lg">
          <BottomNav items={[...STUDENT_NAV_ITEMS]} />
        </div>
      </div>
    </div>
  );
}
