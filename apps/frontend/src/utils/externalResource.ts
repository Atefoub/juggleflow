export function isExternalHttpUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  return !!trimmed && /^https?:\/\//i.test(trimmed);
}

/** Ouvre une ressource externe (YouTube, article, site) dans un nouvel onglet. */
export function openExternalResource(url: string | null | undefined): void {
  const trimmed = url?.trim();
  if (!trimmed) return;
  window.open(trimmed, '_blank', 'noopener,noreferrer');
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtube-nocookie.com')) {
      return u.searchParams.get('v');
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }
  } catch {
    return null;
  }
  return null;
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function isYoutubeUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  return extractYoutubeVideoId(url) != null;
}
