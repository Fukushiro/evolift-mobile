export type Exercise = {
  id: number;
  nome: string;
  video: string;
};

export const exercicios: Exercise[] = [
  {
    id: 1,
    nome: 'Supino reto',
    video: 'https://www.youtube.com/results?search_query=supino+reto+execucao',
  },
  {
    id: 2,
    nome: 'Agachamento livre',
    video: 'https://www.youtube.com/results?search_query=agachamento+livre+execucao',
  },
  {
    id: 3,
    nome: 'Puxada frontal',
    video: 'https://www.youtube.com/results?search_query=puxada+frontal+execucao',
  },
  {
    id: 4,
    nome: 'Desenvolvimento com halteres',
    video: 'https://www.youtube.com/results?search_query=desenvolvimento+com+halteres+execucao',
  },
  {
    id: 5,
    nome: 'Rosca direta',
    video: 'https://www.youtube.com/results?search_query=rosca+direta+execucao',
  },
  {
    id: 6,
    nome: 'Tríceps na polia',
    video: 'https://www.youtube.com/results?search_query=triceps+na+polia+execucao',
  },
  {
    id: 7,
    nome: 'Levantamento terra',
    video: 'https://www.youtube.com/results?search_query=levantamento+terra+execucao',
  },
  {
    id: 8,
    nome: 'Leg press',
    video: 'https://www.youtube.com/results?search_query=leg+press+execucao',
  },
];
