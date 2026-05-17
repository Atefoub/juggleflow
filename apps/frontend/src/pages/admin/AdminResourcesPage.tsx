import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import {
  resourcesApi,
  type PedagogicalResource,
  type ResourceAudience,
  type ResourceType,
} from '../../api/resourcesApi';

type AudienceTab = 'TEACHER' | 'STUDENT';

const AUDIENCE_LABEL: Record<AudienceTab, string> = {
  TEACHER: 'Enseignant',
  STUDENT: 'Élève',
};

const TYPE_LABEL: Record<ResourceType, string> = {
  STUDY_PDF: 'Étude PDF',
  TEACHER_VIDEO: 'Vidéo',
  TEACHER_GUIDE: 'Guide EPS',
  STUDENT_VIDEO: 'Vidéo tutoriel',
  STUDENT_EXERCISE: 'Exercice',
  BRAIN_MODULE: 'Module cerveau',
};

const PDF_TYPES = new Set<ResourceType>(['STUDY_PDF', 'TEACHER_GUIDE']);

function acceptsPdfUpload(type: ResourceType): boolean {
  return PDF_TYPES.has(type);
}

export default function AdminResourcesPage() {
  const [tab, setTab] = useState<AudienceTab>('TEACHER');
  const [resources, setResources] = useState<PedagogicalResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadId = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await resourcesApi.list(tab);
      setResources(data);
    } catch {
      setError('Impossible de charger les ressources.');
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const pdfCount = useMemo(
    () => resources.filter((r) => r.resourceUrl).length,
    [resources],
  );

  function triggerUpload(resourceId: number) {
    pendingUploadId.current = resourceId;
    fileInputRef.current?.click();
  }

  async function onFileSelected(file: File | undefined) {
    const id = pendingUploadId.current;
    pendingUploadId.current = null;
    if (id == null || !file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setFeedback('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    try {
      setUploadingId(id);
      setFeedback(null);
      const updated = await resourcesApi.uploadPdf(id, file);
      setResources((prev) => prev.map((r) => (r.id === id ? updated : r)));
      setFeedback(`Fichier enregistré pour « ${updated.title} ».`);
    } catch {
      setFeedback('Échec de l’upload. Vérifiez la taille (max. 12 Mo) et le format PDF.');
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Ressources pédagogiques"
        description="Métadonnées en base · déposez les PDF pour les études et guides (stockage serveur)."
        actions={
          <button
            type="button"
            onClick={() => load()}
            disabled={isLoading}
            className="jf-admin-btn-secondary"
          >
            {isLoading ? '…' : 'Actualiser'}
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          void onFileSelected(file);
          e.target.value = '';
        }}
      />

      <div className="flex gap-2 mb-4">
        {(['TEACHER', 'STUDENT'] as AudienceTab[]).map((aud) => (
          <button
            key={aud}
            type="button"
            onClick={() => setTab(aud)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-semibold border transition-colors',
              tab === aud
                ? 'bg-[var(--color-admin)] text-white border-[var(--color-admin)]'
                : 'bg-[var(--color-admin-surface)] text-[var(--color-admin-text-muted)] border-[var(--color-admin-border)]',
            ].join(' ')}
          >
            {AUDIENCE_LABEL[aud]}
          </button>
        ))}
      </div>

      {!isLoading && !error && (
        <p className="text-xs text-[var(--color-admin-text-muted)] mb-4">
          {resources.length} ressource(s) · {pdfCount} avec fichier PDF
        </p>
      )}

      {feedback && (
        <p className="text-sm text-[var(--color-admin-success)] mb-4">{feedback}</p>
      )}

      {isLoading && (
        <p className="text-sm text-[var(--color-admin-text-muted)] text-center py-8">
          Chargement…
        </p>
      )}

      {!isLoading && error && (
        <p className="text-sm text-[var(--color-admin-danger)] text-center py-4">{error}</p>
      )}

      {!isLoading && !error && resources.length === 0 && (
        <div className="jf-admin-card p-8 text-center text-sm text-[var(--color-admin-text-muted)]">
          Aucune ressource pour cette audience.
        </div>
      )}

      {!isLoading && !error && resources.length > 0 && (
        <div className="jf-admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-admin-border)] bg-[var(--color-admin-bg)]">
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-admin-text-secondary)]">
                    Titre
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-admin-text-secondary)]">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--color-admin-text-secondary)]">
                    Fichier
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-[var(--color-admin-text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {resources.map((res) => {
                  const hasFile = Boolean(res.resourceUrl);
                  const canUpload = acceptsPdfUpload(res.resourceType);
                  return (
                    <tr
                      key={res.id}
                      className="border-b border-[var(--color-admin-border)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--color-admin-text)]">
                          {res.title}
                        </p>
                        {res.subtitle && (
                          <p className="text-xs text-[var(--color-admin-text-muted)] mt-0.5">
                            {res.subtitle}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-admin-text-secondary)]">
                        {TYPE_LABEL[res.resourceType]}
                      </td>
                      <td className="px-4 py-3">
                        {hasFile ? (
                          <span className="jf-admin-chip jf-admin-chip-success">PDF disponible</span>
                        ) : canUpload ? (
                          <span className="jf-admin-chip">Aucun fichier</span>
                        ) : (
                          <span className="text-xs text-[var(--color-admin-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {hasFile && (
                            <button
                              type="button"
                              className="jf-admin-btn-secondary text-xs"
                              onClick={() => void resourcesApi.download(res.id, res.title)}
                            >
                              Télécharger
                            </button>
                          )}
                          {canUpload && (
                            <button
                              type="button"
                              disabled={uploadingId === res.id}
                              className="jf-admin-btn-primary text-xs"
                              onClick={() => triggerUpload(res.id)}
                            >
                              {uploadingId === res.id ? 'Envoi…' : hasFile ? 'Remplacer PDF' : 'Déposer PDF'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

