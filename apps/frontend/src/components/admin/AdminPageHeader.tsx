import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  /** Titre principal de la page (H1). */
  title: string;
  /** Sous-titre / contexte court affiché sous le titre. */
  description?: ReactNode;
  /** Actions (boutons, liens) affichées à droite sur desktop, dessous sur mobile. */
  actions?: ReactNode;
}

/**
 * En-tête standardisé pour les pages admin.
 *
 * - Titre + description.
 * - Slot `actions` pour les boutons (créer, exporter, etc.).
 *
 * Pattern d'usage :
 *
 *   <AdminPageHeader
 *     title="Utilisateurs"
 *     description="Comptes enseignants et élèves de l'établissement."
 *     actions={<button className="jf-admin-btn-primary">+ Nouveau</button>}
 *   />
 */
export default function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold text-[var(--color-admin-text)] tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--color-admin-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
