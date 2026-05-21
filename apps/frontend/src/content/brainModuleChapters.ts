export interface BrainChapterContent {
  n: number;
  title: string;
  summary: string;
  durationMinutes: number;
  keyPoints: string[];
}

export const BRAIN_MODULE_META = {
  title: 'Comment ton cerveau apprend à jongler ?',
  subtitle:
    'Découvre ce qui se passe dans ta tête quand tu t\'entraînes — sources scientifiques vérifiables.',
  metaLabel: '3 chapitres · ~10 min',
} as const;

export const BRAIN_CHAPTERS: readonly BrainChapterContent[] = [
  {
    n: 1,
    title: 'La plasticité cérébrale',
    summary:
      'Ton cerveau n\'est pas figé : quand tu apprends une nouvelle figure, certaines zones se renforcent. Des chercheurs ont montré qu\'après quelques semaines de cascade, la partie du cerveau qui suit le mouvement (zone hMT/V5) augmente temporairement.',
    durationMinutes: 3,
    keyPoints: [
      'Apprendre = créer de nouvelles connexions entre les neurones.',
      'Le jonglage sollicite fortement la vision et le mouvement.',
      'Les progrès se voient dans le cerveau avant d\'être « parfaits » en jonglage.',
    ],
  },
  {
    n: 2,
    title: 'Mémoire motrice et répétition',
    summary:
      'Chaque séance enregistre un « programme » moteur. Plus tu répètes avec un rythme régulier, plus ce programme devient automatique — tu n\'as plus besoin de tout contrôler consciemment.',
    durationMinutes: 3,
    keyPoints: [
      '10 minutes par jour > une longue séance rare.',
      'Les erreurs font partie de l\'apprentissage : le cerveau corrige au fil des essais.',
      'Dormir et se reposer aide à fixer ce que tu as travaillé.',
    ],
  },
  {
    n: 3,
    title: 'Le rôle de la concentration',
    summary:
      'Jongler demande une attention soutenue : tu suis plusieurs objets, tu coordonnes deux mains et tu gardes un rythme. C\'est un excellent entraînement pour la concentration scolaire.',
    durationMinutes: 4,
    keyPoints: [
      'Les deux hémisphères du cerveau travaillent ensemble.',
      'Regarder le sommet des balles libère tes mains pour mieux réagir.',
      'La persévérance compte autant que le talent naturel.',
    ],
  },
] as const;
