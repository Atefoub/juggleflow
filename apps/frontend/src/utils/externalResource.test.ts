import { describe, expect, it } from 'vitest';
import {
  extractYoutubeVideoId,
  isExternalHttpUrl,
  isYoutubeUrl,
  youtubeEmbedUrl,
} from './externalResource';

describe('externalResource', () => {
  it('détecte les URLs YouTube', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=cDTF4qOvbrs')).toBe('cDTF4qOvbrs');
    expect(extractYoutubeVideoId('https://youtu.be/abc123')).toBe('abc123');
    expect(isYoutubeUrl('https://www.youtube.com/watch?v=1AwZr-uhuZ8')).toBe(true);
  });

  it('construit une URL d’embed sans cookie', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=dCYDZDlcO6g')).toBe(
      'https://www.youtube-nocookie.com/embed/dCYDZDlcO6g?rel=0',
    );
  });

  it('reconnaît les liens HTTP externes', () => {
    expect(isExternalHttpUrl('https://libraryofjuggling.com')).toBe(true);
    expect(isExternalHttpUrl('/api/resources/1/download')).toBe(false);
  });
});
