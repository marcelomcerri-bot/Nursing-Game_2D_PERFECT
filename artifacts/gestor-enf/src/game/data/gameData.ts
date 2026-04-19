import * as Phaser from 'phaser';
import { MAP_COLS, MAP_ROWS, TILE_SIZE, TILE_ID, ROOM_FLOOR_COLORS } from '../constants';

// ─── MAP GENERATION ──────────────────────────────────────────────────────────
function fill(
  map: number[][],
  r1: number, c1: number,
  r2: number, c2: number,
  t: number
) {
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++)
      map[r][c] = t;
}

export function generateMapTiles(): number[][] {
  const { GARDEN, WALL, CORRIDOR, ICU, PHARMACY, ADMIN, WARD, BREAK, NURSING, RECEPTION, EMERGENCY } = TILE_ID;
  const map: number[][] = Array.from({ length: MAP_ROWS }, () => Array(MAP_COLS).fill(GARDEN));

  // Hospital interior (filled with corridor by default)
  fill(map, 2, 2, 33, 47, CORRIDOR);

  // Hospital perimeter walls
  fill(map, 1, 1, 1, 48, WALL);
  fill(map, 34, 1, 34, 48, WALL);
  fill(map, 1, 1, 34, 1, WALL);
  fill(map, 1, 48, 34, 48, WALL);

  // Room floors (overwrite corridor)
  fill(map, 2, 2, 12, 20, ICU);
  fill(map, 2, 25, 12, 35, PHARMACY);
  fill(map, 2, 37, 12, 47, ADMIN);
  fill(map, 17, 2, 33, 20, WARD);
  fill(map, 17, 25, 26, 35, BREAK);
  fill(map, 28, 25, 33, 35, NURSING);
  fill(map, 17, 37, 23, 47, RECEPTION);
  fill(map, 25, 37, 33, 47, EMERGENCY);

  // Interior room walls
  fill(map, 13, 2, 13, 20, WALL);   // ICU south
  fill(map, 2, 21, 12, 21, WALL);   // ICU east
  fill(map, 13, 25, 13, 35, WALL);  // Pharmacy south
  fill(map, 2, 24, 12, 24, WALL);   // Pharmacy west
  fill(map, 13, 37, 13, 47, WALL);  // Admin south
  fill(map, 2, 36, 12, 36, WALL);   // Admin left
  fill(map, 16, 2, 16, 20, WALL);   // Ward north
  fill(map, 17, 21, 33, 21, WALL);  // Ward east
  fill(map, 16, 25, 16, 35, WALL);  // Break north
  fill(map, 17, 24, 33, 24, WALL);  // Break/Nursing west
  fill(map, 27, 25, 27, 35, WALL);  // Break/Nursing divider
  fill(map, 16, 37, 16, 47, WALL);  // Reception north
  fill(map, 17, 36, 33, 36, WALL);  // Reception/Emergency left
  fill(map, 24, 37, 24, 47, WALL);  // Reception/Emergency divider

  // Doors (punch walkable holes in walls)
  map[13][10] = CORRIDOR; map[13][11] = CORRIDOR;    // ICU south door
  map[7][21]  = CORRIDOR;                             // ICU east door
  map[13][29] = CORRIDOR; map[13][30] = CORRIDOR;    // Pharmacy south door
  map[7][24]  = CORRIDOR;                             // Pharmacy west door
  map[13][41] = CORRIDOR; map[13][42] = CORRIDOR;    // Admin south door
  map[7][36]  = CORRIDOR;                             // Admin left door
  map[16][10] = CORRIDOR; map[16][11] = CORRIDOR;    // Ward north door
  map[25][21] = CORRIDOR;                             // Ward east door
  map[16][29] = CORRIDOR; map[16][30] = CORRIDOR;    // Break north door
  map[21][24] = CORRIDOR;                             // Break west door
  map[27][29] = CORRIDOR; map[27][30] = CORRIDOR;    // Break/Nursing door
  map[30][24] = CORRIDOR;                             // Nursing west door
  map[16][41] = CORRIDOR; map[16][42] = CORRIDOR;    // Reception north door
  map[20][36] = CORRIDOR;                             // Reception left door
  map[24][41] = CORRIDOR; map[24][42] = CORRIDOR;    // Emergency north door
  map[28][36] = CORRIDOR;                             // Emergency left door

  return map;
}

// ─── TILESET TEXTURE CREATION ─────────────────────────────────────────────────
export function createTilesetTexture(scene: Phaser.Scene) {
  const NUM_TILES = 11;
  const W = TILE_SIZE;
  const ct = scene.textures.createCanvas('tiles', W * NUM_TILES, W) as Phaser.Textures.CanvasTexture;
  const ctx = ct.getContext();

  const tileColors: Record<number, string> = {
    [TILE_ID.GARDEN]:    '#4a7c59',
    [TILE_ID.WALL]:      '#2d3436',
    [TILE_ID.CORRIDOR]:  '#d4c9b0',
    [TILE_ID.ICU]:       '#a8d8ea',
    [TILE_ID.PHARMACY]:  '#cba4d0',
    [TILE_ID.ADMIN]:     '#f5b87a',
    [TILE_ID.WARD]:      '#d0cce8',
    [TILE_ID.BREAK]:     '#fceaaa',
    [TILE_ID.NURSING]:   '#9edca0',
    [TILE_ID.RECEPTION]: '#f8e080',
    [TILE_ID.EMERGENCY]: '#f4a0a0',
  };

  const shadeDark: Record<number, string> = {
    [TILE_ID.GARDEN]:    '#3a6148',
    [TILE_ID.WALL]:      '#1a1a2e',
    [TILE_ID.CORRIDOR]:  '#c0b49a',
    [TILE_ID.ICU]:       '#8cc4d8',
    [TILE_ID.PHARMACY]:  '#b58cbe',
    [TILE_ID.ADMIN]:     '#e09a5c',
    [TILE_ID.WARD]:      '#bcb8d8',
    [TILE_ID.BREAK]:     '#ecd898',
    [TILE_ID.NURSING]:   '#80c882',
    [TILE_ID.RECEPTION]: '#e0c860',
    [TILE_ID.EMERGENCY]: '#e08888',
  };

  for (let i = 0; i < NUM_TILES; i++) {
    const x = i * W;
    ctx.fillStyle = tileColors[i] || '#888';
    ctx.fillRect(x, 0, W, W);

    if (i === TILE_ID.WALL) {
      // Brick pattern
      ctx.fillStyle = '#1a1a2e';
      for (let row = 0; row < 4; row++) {
        const ox = row % 2 === 0 ? 0 : 8;
        for (let bx = ox; bx < W; bx += 16) {
          ctx.fillRect(x + bx, row * 8, 14, 6);
        }
      }
      // Highlight top/left edges
      ctx.fillStyle = '#4a4a5e';
      ctx.fillRect(x, 0, W, 1);
      ctx.fillRect(x, 0, 1, W);
    } else if (i === TILE_ID.GARDEN) {
      // Grass texture
      ctx.fillStyle = shadeDark[i];
      for (let dy = 2; dy < W; dy += 6) {
        for (let dx = 2; dx < W; dx += 6) {
          if ((dx + dy) % 12 === 0) {
            ctx.fillRect(x + dx, dy, 2, 3);
          }
        }
      }
    } else {
      // Floor tiles: subtle grid + inner border
      ctx.strokeStyle = shadeDark[i];
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      // Grid lines
      ctx.beginPath();
      ctx.moveTo(x + 16, 0); ctx.lineTo(x + 16, W);
      ctx.moveTo(x, 16); ctx.lineTo(x + W, 16);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      // Inner border
      ctx.strokeStyle = shadeDark[i];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.strokeRect(x + 0.5, 0.5, W - 1, W - 1);
      ctx.globalAlpha = 1.0;
    }
  }

  ct.refresh();
  return ct;
}

// ─── NPC DEFINITIONS ─────────────────────────────────────────────────────────
export interface NPCDef {
  id: string;
  name: string;
  title: string;
  spriteKey: string;
  startCol: number;
  startRow: number;
  patrolPoints: { col: number; row: number }[];
  bodyColor: number;
  coatColor: number;
  hairColor: number;
  dialogues: DialogueDef[];
  missionIds: string[];
  schedule: { hour: number; col: number; row: number }[];
}

export interface DialogueDef {
  id: string;
  condition?: (state: GameState) => boolean;
  text: string[];
  choices: DialogueChoice[];
}

export interface DialogueChoice {
  text: string;
  effect?: (state: GameState) => Partial<GameState>;
  missionEffect?: string;
  next?: string;
}

export interface GameState {
  prestige: number;
  energy: number;
  completedMissions: string[];
  missionProgress: Record<string, number>;
  relationships: Record<string, number>;
  gameTime: number;
  day: number;
}

export const NPC_DEFS: NPCDef[] = [
  {
    id: 'dr_oliveira',
    name: 'Dr. Oliveira',
    title: 'Médico Chefe da UTI',
    spriteKey: 'npc_dr',
    startCol: 11, startRow: 7,
    bodyColor: 0xffffff,
    coatColor: 0xe8f4f8,
    hairColor: 0x4a3728,
    patrolPoints: [
      { col: 11, row: 7 }, { col: 5, row: 7 },
      { col: 5, row: 11 }, { col: 14, row: 11 },
      { col: 14, row: 4 }, { col: 8, row: 4 },
    ],
    schedule: [
      { hour: 8,  col: 11, row: 7  },
      { hour: 14, col: 23, row: 14 },
    ],
    missionIds: ['escala_plantao', 'protocolo_uti'],
    dialogues: [
      {
        id: 'intro',
        condition: (s) => !s.completedMissions.includes('welcome'),
        text: [
          'Bom dia! Você é a nova enfermeira gerente?',
          'Precisamos muito de apoio na UTI.',
          'Temos questões sérias de escala para resolver hoje.',
        ],
        choices: [
          {
            text: 'Pode contar comigo, doutor.',
            effect: (s) => ({ prestige: s.prestige + 20 }),
            missionEffect: 'escala_plantao:start',
          },
          {
            text: 'Quais são as prioridades?',
            effect: (s) => ({ prestige: s.prestige + 10 }),
            missionEffect: 'escala_plantao:start',
          },
        ],
      },
      {
        id: 'escala_briefing',
        condition: (s) => s.missionProgress['escala_plantao'] === 1,
        text: [
          'Ótimo! Precisamos de 3 enfermeiros no turno da tarde.',
          'Fale com a Enf. Maria no Posto de Enfermagem.',
          'Ela tem a lista de disponibilidade da equipe.',
        ],
        choices: [
          {
            text: 'Entendido. Vou providenciar.',
            missionEffect: 'escala_plantao:step2',
          },
        ],
      },
      {
        id: 'protocolo_start',
        condition: (s) => s.completedMissions.includes('escala_plantao') && !s.completedMissions.includes('protocolo_uti'),
        text: [
          'Excelente trabalho com a escala!',
          'Agora precisamos implementar o protocolo de sepse na UTI.',
          'É uma exigência da acreditação hospitalar.',
        ],
        choices: [
          {
            text: 'Vou reunir a equipe para discutir.',
            effect: (s) => ({ prestige: s.prestige + 30 }),
            missionEffect: 'protocolo_uti:start',
          },
          {
            text: 'Preciso estudar o protocolo antes.',
            missionEffect: 'protocolo_uti:start',
          },
        ],
      },
      {
        id: 'idle',
        text: [
          'Como vai o andamento das missões?',
          'Qualquer dúvida, estou aqui na UTI.',
        ],
        choices: [{ text: 'Obrigada, doutor.' }],
      },
    ],
  },
  {
    id: 'joao_farmaceutico',
    name: 'Farmacêutico João',
    title: 'Responsável pela Farmácia',
    spriteKey: 'npc_joao',
    startCol: 30, startRow: 7,
    bodyColor: 0xffffff,
    coatColor: 0xe8d8f0,
    hairColor: 0x1a1a1a,
    patrolPoints: [
      { col: 30, row: 7 }, { col: 26, row: 7 },
      { col: 26, row: 11 }, { col: 33, row: 11 },
      { col: 33, row: 4 }, { col: 29, row: 4 },
    ],
    schedule: [
      { hour: 8,  col: 30, row: 7  },
      { hour: 16, col: 30, row: 11 },
    ],
    missionIds: ['estoque_farmacia'],
    dialogues: [
      {
        id: 'intro',
        condition: (s) => !s.completedMissions.includes('estoque_farmacia') && !s.missionProgress['estoque_farmacia'],
        text: [
          'Oi! Que bom que passou por aqui.',
          'Estamos com o estoque de medicamentos desorganizado.',
          'Algumas drogas vasoativas estão quase no fim!',
        ],
        choices: [
          {
            text: 'Vou fazer um levantamento urgente.',
            effect: (s) => ({ prestige: s.prestige + 15 }),
            missionEffect: 'estoque_farmacia:start',
          },
          {
            text: 'Quais medicamentos são críticos?',
            missionEffect: 'estoque_farmacia:start',
          },
        ],
      },
      {
        id: 'estoque_progress',
        condition: (s) => s.missionProgress['estoque_farmacia'] === 1,
        text: [
          'Precisamos de: Norepinefrina, Midazolam e Morfina.',
          'O pedido tem que ser aprovado pela Diretora Alves.',
          'Procure ela no Administrativo.',
        ],
        choices: [
          {
            text: 'Certo, falarei com ela agora.',
            missionEffect: 'estoque_farmacia:step2',
          },
        ],
      },
      {
        id: 'idle',
        text: [
          'A farmácia está funcionando melhor agora.',
          'Qualquer necessidade de medicamentos, é só avisar!',
        ],
        choices: [{ text: 'Ótimo trabalho, João!' }],
      },
    ],
  },
  {
    id: 'diretora_alves',
    name: 'Diretora Alves',
    title: 'Diretora de Enfermagem',
    spriteKey: 'npc_diretora',
    startCol: 42, startRow: 7,
    bodyColor: 0x2c3e50,
    coatColor: 0x34495e,
    hairColor: 0x7f8c8d,
    patrolPoints: [
      { col: 42, row: 7 }, { col: 38, row: 7 },
      { col: 38, row: 10 }, { col: 44, row: 10 },
      { col: 44, row: 4 }, { col: 40, row: 4 },
    ],
    schedule: [
      { hour: 9,  col: 42, row: 7  },
      { hour: 14, col: 23, row: 14 },
      { hour: 17, col: 42, row: 7  },
    ],
    missionIds: ['estoque_farmacia', 'orcamento', 'acreditacao'],
    dialogues: [
      {
        id: 'estoque_approval',
        condition: (s) => s.missionProgress['estoque_farmacia'] === 2,
        text: [
          'Sim, vi o pedido do João.',
          'Esses medicamentos são essenciais para a UTI.',
          'Preciso que você justifique o custo pelo protocolo técnico.',
        ],
        choices: [
          {
            text: 'A justificativa é segurança do paciente crítico.',
            effect: (s) => ({ prestige: s.prestige + 25 }),
            missionEffect: 'estoque_farmacia:complete',
          },
          {
            text: 'Posso preparar um relatório detalhado.',
            effect: (s) => ({ prestige: s.prestige + 20 }),
            missionEffect: 'estoque_farmacia:complete',
          },
        ],
      },
      {
        id: 'orcamento_intro',
        condition: (s) => s.completedMissions.includes('estoque_farmacia') && !s.missionProgress['orcamento'],
        text: [
          'A gestão de custos está muito acima do orçado.',
          'Precisamos revisar os processos em todos os setores.',
          'Você pode coordenar esse levantamento?',
        ],
        choices: [
          {
            text: 'Claro, vou mapear os desperdícios.',
            effect: (s) => ({ prestige: s.prestige + 30 }),
            missionEffect: 'orcamento:start',
          },
        ],
      },
      {
        id: 'acreditacao_intro',
        condition: (s) => s.completedMissions.includes('protocolo_uti') && !s.missionProgress['acreditacao'],
        text: [
          'Parabéns pelo protocolo da UTI!',
          'A ONA (acreditação) fará visita em 30 dias.',
          'Precisamos organizar toda a documentação.',
        ],
        choices: [
          {
            text: 'Vamos começar pela UTI e PS.',
            effect: (s) => ({ prestige: s.prestige + 40 }),
            missionEffect: 'acreditacao:start',
          },
        ],
      },
      {
        id: 'idle',
        text: [
          'Continue o bom trabalho.',
          'Nossa equipe precisa de uma liderança forte como a sua.',
        ],
        choices: [{ text: 'Obrigada, diretora.' }],
      },
    ],
  },
  {
    id: 'enf_maria',
    name: 'Enf. Maria',
    title: 'Supervisora de Enfermagem',
    spriteKey: 'npc_maria',
    startCol: 30, startRow: 30,
    bodyColor: 0xffffff,
    coatColor: 0xcceecc,
    hairColor: 0x2c1810,
    patrolPoints: [
      { col: 30, row: 30 }, { col: 27, row: 30 },
      { col: 27, row: 32 }, { col: 33, row: 32 },
      { col: 33, row: 28 }, { col: 29, row: 28 },
    ],
    schedule: [
      { hour: 7,  col: 30, row: 30 },
      { hour: 12, col: 30, row: 21 },
      { hour: 15, col: 30, row: 30 },
    ],
    missionIds: ['escala_plantao', 'ronda_enfermaria', 'capacitacao'],
    dialogues: [
      {
        id: 'escala_help',
        condition: (s) => s.missionProgress['escala_plantao'] === 2,
        text: [
          'Oi! Estava esperando por você.',
          'Tenho 5 enfermeiros disponíveis para a tarde.',
          'Mas 2 precisam de folga compensatória amanhã.',
          'Como quer organizar?',
        ],
        choices: [
          {
            text: 'Prioridade aos que têm mais horas extras.',
            effect: (s) => ({ prestige: s.prestige + 35 }),
            missionEffect: 'escala_plantao:complete',
          },
          {
            text: 'Seguirei o critério de antiguidade.',
            effect: (s) => ({ prestige: s.prestige + 25 }),
            missionEffect: 'escala_plantao:complete',
          },
        ],
      },
      {
        id: 'ronda_intro',
        condition: (s) => !s.missionProgress['ronda_enfermaria'],
        text: [
          'A ronda de enfermagem está atrasada hoje.',
          'Os pacientes da Enfermaria precisam de avaliação.',
          'Pode fazer a ronda com a equipe?',
        ],
        choices: [
          {
            text: 'Sim, vamos lá agora.',
            effect: (s) => ({ prestige: s.prestige + 20, energy: s.energy - 15 }),
            missionEffect: 'ronda_enfermaria:complete',
          },
          {
            text: 'Daqui a pouco, estou resolvendo outra coisa.',
            effect: (s) => ({ prestige: s.prestige + 5 }),
          },
        ],
      },
      {
        id: 'capacitacao_intro',
        condition: (s) => s.completedMissions.length >= 2 && !s.missionProgress['capacitacao'],
        text: [
          'A equipe está precisando de capacitação em SAE.',
          'Você poderia coordenar um treinamento?',
          'A SAE (Sistematização da Assistência de Enfermagem) é essencial!',
        ],
        choices: [
          {
            text: 'Vou organizar para a próxima semana.',
            effect: (s) => ({ prestige: s.prestige + 30 }),
            missionEffect: 'capacitacao:start',
          },
        ],
      },
      {
        id: 'idle',
        text: [
          'O plantão está bem hoje, obrigada!',
          'Equipe engajada é tudo nessa profissão.',
        ],
        choices: [{ text: 'Com certeza, Maria!' }],
      },
    ],
  },
  {
    id: 'ana_recepcionista',
    name: 'Ana',
    title: 'Recepcionista',
    spriteKey: 'npc_ana',
    startCol: 42, startRow: 20,
    bodyColor: 0xffffff,
    coatColor: 0xa0c8d8,
    hairColor: 0x6b3a2a,
    patrolPoints: [
      { col: 42, row: 20 }, { col: 38, row: 20 },
      { col: 38, row: 22 }, { col: 44, row: 22 },
      { col: 44, row: 18 }, { col: 40, row: 18 },
    ],
    schedule: [
      { hour: 7,  col: 42, row: 20 },
      { hour: 19, col: 42, row: 20 },
    ],
    missionIds: ['triagem_ps'],
    dialogues: [
      {
        id: 'triagem_intro',
        condition: (s) => !s.missionProgress['triagem_ps'],
        text: [
          'Bom dia! O Pronto-Socorro está cheio hoje.',
          'Já temos 8 pacientes aguardando triagem.',
          'O sistema de classificação de risco está lento.',
        ],
        choices: [
          {
            text: 'Vou implementar o Manchester agora.',
            effect: (s) => ({ prestige: s.prestige + 20 }),
            missionEffect: 'triagem_ps:start',
          },
          {
            text: 'Chame mais um técnico para ajudar.',
            effect: (s) => ({ prestige: s.prestige + 10 }),
            missionEffect: 'triagem_ps:start',
          },
        ],
      },
      {
        id: 'idle',
        text: [
          'O fluxo de atendimento está melhor!',
          'A triagem organizada faz toda diferença.',
        ],
        choices: [{ text: 'Fico feliz em ouvir isso!' }],
      },
    ],
  },
];

// ─── MISSION DEFINITIONS ──────────────────────────────────────────────────────
export interface MissionDef {
  id: string;
  title: string;
  description: string;
  category: string;
  prestige: number;
  steps: number;
  prerequisiteIds: string[];
  pedagogy: string;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'escala_plantao',
    title: 'Escala do Plantão',
    description: 'Organizar a escala de enfermeiros para o turno da tarde com 3 profissionais.',
    category: 'Recursos Humanos',
    prestige: 100,
    steps: 3,
    prerequisiteIds: [],
    pedagogy: 'A elaboração de escalas é função essencial do enfermeiro gerente (Kurcgant, 2016).',
  },
  {
    id: 'estoque_farmacia',
    title: 'Estoque Crítico de Medicamentos',
    description: 'Resolver a falta de drogas vasoativas na farmácia hospitalar.',
    category: 'Gestão de Insumos',
    prestige: 120,
    steps: 3,
    prerequisiteIds: [],
    pedagogy: 'O controle de materiais e medicamentos é estratégico para a segurança do paciente (Marquis & Huston, 2015).',
  },
  {
    id: 'ronda_enfermaria',
    title: 'Ronda de Enfermagem',
    description: 'Realizar a ronda de avaliação dos pacientes internados na Enfermaria.',
    category: 'Assistência',
    prestige: 75,
    steps: 1,
    prerequisiteIds: [],
    pedagogy: 'A ronda de enfermagem garante a continuidade e qualidade do cuidado (Cofen, 2017).',
  },
  {
    id: 'triagem_ps',
    title: 'Triagem do Pronto-Socorro',
    description: 'Implementar o Sistema Manchester de Classificação de Risco.',
    category: 'Qualidade',
    prestige: 90,
    steps: 2,
    prerequisiteIds: [],
    pedagogy: 'A classificação de risco é uma das 10 metas da segurança do paciente (OMS, 2019).',
  },
  {
    id: 'protocolo_uti',
    title: 'Protocolo de Sepse na UTI',
    description: 'Implementar o bundle de prevenção e tratamento de sepse na UTI.',
    category: 'Protocolos',
    prestige: 200,
    steps: 3,
    prerequisiteIds: ['escala_plantao'],
    pedagogy: 'Protocolos clínicos reduzem variabilidade e melhoram desfechos (Kurcgant, 2016; ILAS, 2020).',
  },
  {
    id: 'capacitacao',
    title: 'Capacitação em SAE',
    description: 'Coordenar treinamento sobre Sistematização da Assistência de Enfermagem.',
    category: 'Educação',
    prestige: 150,
    steps: 2,
    prerequisiteIds: ['ronda_enfermaria'],
    pedagogy: 'A educação continuada é responsabilidade gerencial do enfermeiro (Cofen Resolução 358/2009).',
  },
  {
    id: 'orcamento',
    title: 'Revisão Orçamentária',
    description: 'Mapear e reduzir os desperdícios de recursos nos setores hospitalares.',
    category: 'Financeiro',
    prestige: 180,
    steps: 3,
    prerequisiteIds: ['estoque_farmacia'],
    pedagogy: 'A gestão financeira em enfermagem visa qualidade com eficiência de recursos (Marquis & Huston, 2015).',
  },
  {
    id: 'acreditacao',
    title: 'Preparação para Acreditação ONA',
    description: 'Organizar a documentação e processos para a visita da acreditação hospitalar.',
    category: 'Qualidade',
    prestige: 300,
    steps: 4,
    prerequisiteIds: ['protocolo_uti', 'capacitacao'],
    pedagogy: 'A acreditação hospitalar é o mais alto nível de reconhecimento da qualidade assistencial (ONA, 2018).',
  },
];

// ─── LEVEL SYSTEM ─────────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, title: 'Estagiária',               minPrestige: 0   },
  { level: 2, title: 'Enfermeira',                minPrestige: 150 },
  { level: 3, title: 'Enf. Especialista',         minPrestige: 400 },
  { level: 4, title: 'Supervisora de Plantão',    minPrestige: 750 },
  { level: 5, title: 'Gerente de Enfermagem',     minPrestige: 1200 },
  { level: 6, title: 'Diretora de Enfermagem',    minPrestige: 2000 },
];

export function getLevelInfo(prestige: number) {
  let current = LEVELS[0];
  for (const lv of LEVELS) {
    if (prestige >= lv.minPrestige) current = lv;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1];
  const progress = next
    ? (prestige - current.minPrestige) / (next.minPrestige - current.minPrestige)
    : 1;
  return { ...current, next, progress };
}
