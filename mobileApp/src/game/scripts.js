import {
  TROUBLE_BREWING_ROLES,
  SECTS_AND_VIOLETS_ROLES,
  BAD_MOON_RISING_ROLES,
  RoleType,
} from './roles';

export const ScriptId = {
  TROUBLE_BREWING: 'trouble_brewing',
  SECTS_AND_VIOLETS: 'sects_and_violets',
  BAD_MOON_RISING: 'bad_moon_rising',
  CUSTOM: 'custom',
};

function splitByType(roles) {
  const result = {
    townsfolk: [],
    outsiders: [],
    minions: [],
    demons: [],
  };
  for (const role of Object.values(roles)) {
    switch (role.type) {
      case RoleType.TOWNSFOLK: result.townsfolk.push(role.id); break;
      case RoleType.OUTSIDER: result.outsiders.push(role.id); break;
      case RoleType.MINION: result.minions.push(role.id); break;
      case RoleType.DEMON: result.demons.push(role.id); break;
    }
  }
  return result;
}

const tbRoles = splitByType(TROUBLE_BREWING_ROLES);
const svRoles = splitByType(SECTS_AND_VIOLETS_ROLES);
const bmrRoles = splitByType(BAD_MOON_RISING_ROLES);

export const SCRIPTS = {
  [ScriptId.TROUBLE_BREWING]: {
    id: ScriptId.TROUBLE_BREWING,
    name: 'Trouble Brewing',
    description: 'The introductory script. Simple characters and interactions. Recommended for new players.',
    color: '#e74c3c',
    icon: 'flame',
    ...tbRoles,
    allRoles: Object.keys(TROUBLE_BREWING_ROLES),
    firstNightOrder: [
      'poisoner',
      'washerwoman',
      'librarian',
      'investigator',
      'chef',
      'empath',
      'fortune_teller',
      'butler',
      'spy',
    ],
    otherNightOrder: [
      'poisoner',
      'monk',
      'scarlet_woman',
      'imp',
      'ravenkeeper',
      'undertaker',
      'empath',
      'fortune_teller',
      'butler',
      'spy',
    ],
    jinxes: [],
  },
  [ScriptId.SECTS_AND_VIOLETS]: {
    id: ScriptId.SECTS_AND_VIOLETS,
    name: 'Sects & Violets',
    description: 'Madness, manipulation, and mind games. Characters that change and deceive. Intermediate difficulty.',
    color: '#9b59b6',
    icon: 'flower',
    ...svRoles,
    allRoles: Object.keys(SECTS_AND_VIOLETS_ROLES),
    firstNightOrder: [
      'philosopher',
      'snake_charmer',
      'evil_twin',
      'witch',
      'cerenovus',
      'clockmaker',
      'dreamer',
      'seamstress',
      'mathematician',
    ],
    otherNightOrder: [
      'philosopher',
      'snake_charmer',
      'witch',
      'cerenovus',
      'pit_hag',
      'vortox',
      'no_dashii',
      'fang_gu',
      'vigormortis',
      'barber',
      'sage',
      'seamstress',
      'flowergirl',
      'town_crier',
      'oracle',
      'juggler',
      'mathematician',
    ],
    jinxes: [
      { roles: ['pit_hag', 'fang_gu'], text: 'If the Pit-Hag creates a Fang Gu, the Fang Gu does not get the extra Outsider.' },
      { roles: ['pit_hag', 'vigormortis'], text: 'If the Pit-Hag creates a Vigormortis, the Vigormortis does not get the -1 Outsider.' },
    ],
  },
  [ScriptId.BAD_MOON_RISING]: {
    id: ScriptId.BAD_MOON_RISING,
    name: 'Bad Moon Rising',
    description: 'Death is lurking. Protect yourself and your allies. Many ways to die, but also to cheat death. Advanced difficulty.',
    color: '#e67e22',
    icon: 'moon',
    ...bmrRoles,
    allRoles: Object.keys(BAD_MOON_RISING_ROLES),
    firstNightOrder: [
      'lunatic',
      'sailor',
      'courtier',
      'godfather',
      'devils_advocate',
      'pukka',
      'grandmother',
      'chambermaid',
    ],
    otherNightOrder: [
      'gambler',
      'sailor',
      'lunatic',
      'courtier',
      'innkeeper',
      'devils_advocate',
      'exorcist',
      'pukka',
      'shabaloth',
      'zombuul',
      'po',
      'assassin',
      'godfather',
      'gossip',
      'moonchild',
      'professor',
      'chambermaid',
    ],
    jinxes: [],
  },
};

export function getScript(scriptId) {
  return SCRIPTS[scriptId] || null;
}

export function getScriptList() {
  return Object.values(SCRIPTS);
}
