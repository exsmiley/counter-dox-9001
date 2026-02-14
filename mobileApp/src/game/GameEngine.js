import {
  ALL_ROLES,
  getRoleById,
  RoleType,
  Team,
  Phase,
  PLAYER_COUNT_DISTRIBUTION,
} from './roles';
import { SCRIPTS } from './scripts';

// Generate a unique ID
function generateId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Shuffle an array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// GAME STATE CREATION
// ============================================================

export function createGame({ scriptId, playerNames, storytellerMode = false }) {
  const script = SCRIPTS[scriptId];
  if (!script) throw new Error(`Unknown script: ${scriptId}`);

  const playerCount = playerNames.length;
  const distribution = PLAYER_COUNT_DISTRIBUTION[playerCount];
  if (!distribution) {
    throw new Error(`Player count ${playerCount} not supported (5-20 players needed)`);
  }

  const gameId = generateId();
  const players = playerNames.map((name, index) => ({
    id: generateId(),
    name,
    seatIndex: index,
    role: null,
    actualRole: null, // the "real" role (different for Drunk, Lunatic, etc.)
    perceivedRole: null, // what the player thinks their role is
    alive: true,
    poisoned: false,
    drunk: false,
    protected: false,
    ghostVoteUsed: false,
    canVote: true,
    voteWeight: 1,
    reminders: [],
    diedAtNight: false,
    diedToday: false,
    executedToday: false,
    nominations: 0,
    hasBeenNominated: false,
    hasNominated: false,
    usedOncePerGameAbility: false,
    butlerMaster: null,
    nightInfo: null,
  }));

  return {
    gameId,
    scriptId,
    script: script.name,
    players,
    phase: Phase.SETUP,
    dayNumber: 0,
    nightNumber: 0,
    isFirstNight: true,
    storytellerMode,

    // Role assignment
    rolesInPlay: [],
    demonBluffs: [], // 3 not-in-play good roles shown to demon

    // Night state
    nightActions: [],
    nightDeaths: [],
    pendingNightAction: null,
    nightActionIndex: 0,

    // Day state
    nominations: [],
    currentNomination: null,
    votes: {},
    executionTarget: null,
    executionVotes: 0,
    voteThreshold: 0,
    slayerUsed: false,

    // Storyteller tracking
    fortuneTellerRedHerring: null,
    drunkPerceivedRole: null,

    // Win condition
    winner: null,
    gameLog: [],

    // Timing
    createdAt: Date.now(),
  };
}

// ============================================================
// ROLE ASSIGNMENT
// ============================================================

export function assignRoles(gameState) {
  const script = SCRIPTS[gameState.scriptId];
  const playerCount = gameState.players.length;
  let [numTownsfolk, numOutsiders, numMinions, numDemons] = PLAYER_COUNT_DISTRIBUTION[playerCount];

  // Check for Baron (adds 2 outsiders, removes 2 townsfolk)
  const availableMinions = shuffle([...script.minions]);
  const selectedMinions = availableMinions.slice(0, numMinions);
  if (selectedMinions.includes('baron')) {
    numOutsiders += 2;
    numTownsfolk -= 2;
  }

  // Check for Fang Gu (+1 outsider) and Vigormortis (-1 outsider)
  const availableDemons = shuffle([...script.demons]);
  const selectedDemons = availableDemons.slice(0, numDemons);
  for (const demonId of selectedDemons) {
    const role = getRoleById(demonId);
    if (role && role.setup) {
      if (role.setupEffect === 'addOutsiders') {
        numOutsiders += role.setupValue;
        numTownsfolk -= role.setupValue;
      } else if (role.setupEffect === 'removeOutsiders') {
        numOutsiders -= role.setupValue;
        numTownsfolk += role.setupValue;
      }
    }
  }

  // Godfather (+/- 1 outsider)
  if (selectedMinions.includes('godfather')) {
    const mod = Math.random() > 0.5 ? 1 : -1;
    numOutsiders += mod;
    numTownsfolk -= mod;
  }

  // Clamp values
  numOutsiders = Math.max(0, numOutsiders);
  numTownsfolk = Math.max(0, numTownsfolk);

  // Select roles
  const availableTownsfolk = shuffle([...script.townsfolk]);
  const availableOutsiders = shuffle([...script.outsiders]);

  let selectedTownsfolk = availableTownsfolk.slice(0, numTownsfolk);
  let selectedOutsiders = availableOutsiders.slice(0, numOutsiders);

  // Handle Drunk: picks a townsfolk to "be"
  let drunkPerceivedRole = null;
  if (selectedOutsiders.includes('drunk')) {
    const unusedTownsfolk = availableTownsfolk.filter(
      r => !selectedTownsfolk.includes(r)
    );
    if (unusedTownsfolk.length > 0) {
      drunkPerceivedRole = unusedTownsfolk[Math.floor(Math.random() * unusedTownsfolk.length)];
    } else {
      drunkPerceivedRole = selectedTownsfolk[0]; // fallback
    }
  }

  // Handle Lunatic: thinks they are the demon
  const lunaticInPlay = selectedOutsiders.includes('lunatic');

  // Combine all roles and shuffle
  const allSelected = [...selectedTownsfolk, ...selectedOutsiders, ...selectedMinions, ...selectedDemons];
  const shuffledRoles = shuffle(allSelected);

  // Assign roles to players
  const newPlayers = gameState.players.map((player, idx) => {
    const roleId = shuffledRoles[idx];
    const role = getRoleById(roleId);
    let perceivedRole = roleId;
    let actualRole = roleId;

    // Drunk thinks they're a townsfolk
    if (roleId === 'drunk' && drunkPerceivedRole) {
      perceivedRole = drunkPerceivedRole;
    }

    // Lunatic thinks they're the demon
    if (roleId === 'lunatic') {
      const demonInPlay = selectedDemons[0];
      perceivedRole = demonInPlay;
      actualRole = 'lunatic';
    }

    return {
      ...player,
      role: roleId,
      actualRole,
      perceivedRole,
    };
  });

  // Generate demon bluffs (3 not-in-play good characters)
  const allGoodInScript = [...script.townsfolk, ...script.outsiders];
  const inPlayRoles = new Set(shuffledRoles);
  const notInPlay = allGoodInScript.filter(r => !inPlayRoles.has(r));
  const demonBluffs = shuffle(notInPlay).slice(0, 3);

  // Fortune Teller red herring
  const goodPlayers = newPlayers.filter(p =>
    getRoleById(p.role)?.team === Team.GOOD
  );
  const redHerring = goodPlayers.length > 0
    ? goodPlayers[Math.floor(Math.random() * goodPlayers.length)].id
    : null;

  return {
    ...gameState,
    players: newPlayers,
    rolesInPlay: shuffledRoles,
    demonBluffs,
    fortuneTellerRedHerring: redHerring,
    drunkPerceivedRole,
    phase: Phase.FIRST_NIGHT,
    nightNumber: 1,
    isFirstNight: true,
    gameLog: [
      ...gameState.gameLog,
      { type: 'setup', message: `Game created with ${playerCount} players using ${gameState.script}`, timestamp: Date.now() },
      { type: 'setup', message: `Roles assigned. ${numTownsfolk} Townsfolk, ${numOutsiders} Outsiders, ${numMinions} Minions, ${numDemons} Demon.`, timestamp: Date.now() },
    ],
  };
}

// ============================================================
// NIGHT PHASE
// ============================================================

export function getNightOrder(gameState) {
  const script = SCRIPTS[gameState.scriptId];
  const orderKey = gameState.isFirstNight ? 'firstNightOrder' : 'otherNightOrder';
  const order = script[orderKey] || [];

  // Filter to only roles that are in play and have alive players (mostly)
  return order.filter(roleId => {
    const role = getRoleById(roleId);
    if (!role) return false;

    const player = gameState.players.find(p => p.role === roleId && p.alive);
    if (!player) {
      // Ravenkeeper triggers when dying
      if (roleId === 'ravenkeeper') {
        return gameState.players.some(p => p.role === roleId && p.diedAtNight);
      }
      return false;
    }

    // Skip abilities that don't apply
    if (role.nightAction) {
      if (role.nightAction.timing === 'eachNightStar' && gameState.isFirstNight) {
        return false;
      }
      if (role.nightAction.timing === 'firstNight' && !gameState.isFirstNight) {
        return false;
      }
    }

    return true;
  });
}

export function startNightPhase(gameState) {
  const phase = gameState.isFirstNight ? Phase.FIRST_NIGHT : Phase.NIGHT;
  const nightOrder = getNightOrder({ ...gameState, phase });

  return {
    ...gameState,
    phase,
    nightActions: [],
    nightDeaths: [],
    nightActionIndex: 0,
    pendingNightAction: nightOrder.length > 0 ? nightOrder[0] : null,
    players: gameState.players.map(p => ({
      ...p,
      diedAtNight: false,
      poisoned: false,
      protected: false,
      nightInfo: null,
    })),
    gameLog: [
      ...gameState.gameLog,
      { type: 'phase', message: `Night ${gameState.nightNumber} begins.`, timestamp: Date.now() },
    ],
  };
}

export function processNightAction(gameState, roleId, action) {
  const role = getRoleById(roleId);
  const player = gameState.players.find(p => p.role === roleId || p.actualRole === roleId);
  if (!player || !role) return gameState;

  let newState = { ...gameState };
  let newPlayers = [...newState.players];
  const playerIndex = newPlayers.findIndex(p => p.id === player.id);
  const isPoisonedOrDrunk = player.poisoned || player.drunk;

  const logEntry = (msg) => ({
    type: 'night',
    message: msg,
    timestamp: Date.now(),
    private: true,
  });

  switch (roleId) {
    // === TROUBLE BREWING ===
    case 'poisoner': {
      if (action.targetId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          newPlayers[targetIdx] = { ...newPlayers[targetIdx], poisoned: true };
          newState.gameLog = [...newState.gameLog, logEntry(`Poisoner poisoned ${newPlayers[targetIdx].name}`)];
        }
      }
      break;
    }

    case 'washerwoman': {
      if (!isPoisonedOrDrunk) {
        const info = generateTwoPlayersOneIsInfo(newPlayers, RoleType.TOWNSFOLK, player.id);
        newPlayers[playerIndex] = { ...newPlayers[playerIndex], nightInfo: info };
      } else {
        const info = generateFalseTwoPlayersInfo(newPlayers, RoleType.TOWNSFOLK, player.id, gameState);
        newPlayers[playerIndex] = { ...newPlayers[playerIndex], nightInfo: info };
      }
      newState.gameLog = [...newState.gameLog, logEntry(`Washerwoman received info`)];
      break;
    }

    case 'librarian': {
      if (!isPoisonedOrDrunk) {
        const info = generateTwoPlayersOneIsInfo(newPlayers, RoleType.OUTSIDER, player.id);
        newPlayers[playerIndex] = { ...newPlayers[playerIndex], nightInfo: info };
      } else {
        const info = generateFalseTwoPlayersInfo(newPlayers, RoleType.OUTSIDER, player.id, gameState);
        newPlayers[playerIndex] = { ...newPlayers[playerIndex], nightInfo: info };
      }
      newState.gameLog = [...newState.gameLog, logEntry(`Librarian received info`)];
      break;
    }

    case 'investigator': {
      if (!isPoisonedOrDrunk) {
        const info = generateTwoPlayersOneIsInfo(newPlayers, RoleType.MINION, player.id);
        newPlayers[playerIndex] = { ...newPlayers[playerIndex], nightInfo: info };
      } else {
        const info = generateFalseTwoPlayersInfo(newPlayers, RoleType.MINION, player.id, gameState);
        newPlayers[playerIndex] = { ...newPlayers[playerIndex], nightInfo: info };
      }
      newState.gameLog = [...newState.gameLog, logEntry(`Investigator received info`)];
      break;
    }

    case 'chef': {
      const count = isPoisonedOrDrunk
        ? Math.floor(Math.random() * 3)
        : countEvilPairs(newPlayers);
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        nightInfo: { type: 'number', label: 'Evil pairs', value: count },
      };
      newState.gameLog = [...newState.gameLog, logEntry(`Chef learned ${count} evil pairs`)];
      break;
    }

    case 'empath': {
      const count = isPoisonedOrDrunk
        ? Math.floor(Math.random() * 3)
        : countEvilNeighbors(newPlayers, playerIndex);
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        nightInfo: { type: 'number', label: 'Evil neighbors', value: count },
      };
      newState.gameLog = [...newState.gameLog, logEntry(`Empath learned ${count} evil neighbors`)];
      break;
    }

    case 'fortune_teller': {
      if (action.targetIds && action.targetIds.length === 2) {
        const [t1, t2] = action.targetIds;
        let result = false;
        if (!isPoisonedOrDrunk) {
          const p1 = newPlayers.find(p => p.id === t1);
          const p2 = newPlayers.find(p => p.id === t2);
          const isDemon = (p) => {
            if (!p) return false;
            const r = getRoleById(p.role);
            return r?.type === RoleType.DEMON || p.id === gameState.fortuneTellerRedHerring;
          };
          result = isDemon(p1) || isDemon(p2);
        } else {
          result = Math.random() > 0.5;
        }
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          nightInfo: { type: 'yesno', label: 'Demon detected', value: result },
        };
      }
      newState.gameLog = [...newState.gameLog, logEntry(`Fortune Teller checked players`)];
      break;
    }

    case 'undertaker': {
      const executed = newPlayers.find(p => p.executedToday);
      if (executed && !isPoisonedOrDrunk) {
        const executedRole = getRoleById(executed.role);
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          nightInfo: { type: 'role', label: 'Executed player was', value: executedRole?.name || 'Unknown' },
        };
      } else if (executed && isPoisonedOrDrunk) {
        const allRoles = Object.values(ALL_ROLES).filter(r =>
          r.type !== RoleType.TRAVELLER && r.type !== RoleType.FABLED
        );
        const falseRole = allRoles[Math.floor(Math.random() * allRoles.length)];
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          nightInfo: { type: 'role', label: 'Executed player was', value: falseRole.name },
        };
      }
      newState.gameLog = [...newState.gameLog, logEntry(`Undertaker received info`)];
      break;
    }

    case 'monk': {
      if (action.targetId && !isPoisonedOrDrunk) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          newPlayers[targetIdx] = { ...newPlayers[targetIdx], protected: true };
          newState.gameLog = [...newState.gameLog, logEntry(`Monk protected ${newPlayers[targetIdx].name}`)];
        }
      }
      break;
    }

    case 'ravenkeeper': {
      if (action.targetId) {
        const target = newPlayers.find(p => p.id === action.targetId);
        if (target && !isPoisonedOrDrunk) {
          const targetRole = getRoleById(target.role);
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            nightInfo: { type: 'role', label: `${target.name} is the`, value: targetRole?.name || 'Unknown' },
          };
        } else if (target && isPoisonedOrDrunk) {
          const allRoles = Object.values(ALL_ROLES).filter(r =>
            r.type !== RoleType.TRAVELLER && r.type !== RoleType.FABLED
          );
          const falseRole = allRoles[Math.floor(Math.random() * allRoles.length)];
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            nightInfo: { type: 'role', label: `${target.name} is the`, value: falseRole.name },
          };
        }
      }
      newState.gameLog = [...newState.gameLog, logEntry(`Ravenkeeper used ability`)];
      break;
    }

    case 'butler': {
      if (action.targetId) {
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          butlerMaster: action.targetId,
        };
        const master = newPlayers.find(p => p.id === action.targetId);
        newState.gameLog = [...newState.gameLog, logEntry(`Butler chose ${master?.name} as master`)];
      }
      break;
    }

    case 'spy': {
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        nightInfo: {
          type: 'grimoire',
          label: 'Grimoire',
          value: newPlayers.map(p => ({
            name: p.name,
            role: getRoleById(p.role)?.name || 'Unknown',
            alive: p.alive,
          })),
        },
      };
      newState.gameLog = [...newState.gameLog, logEntry(`Spy viewed the Grimoire`)];
      break;
    }

    case 'scarlet_woman': {
      // Passive - handled in execution logic
      break;
    }

    case 'imp': {
      if (action.targetId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          const target = newPlayers[targetIdx];

          // Self-kill: a minion becomes the imp
          if (target.id === player.id) {
            const minions = newPlayers.filter(p =>
              getRoleById(p.role)?.type === RoleType.MINION && p.alive && p.id !== player.id
            );
            if (minions.length > 0) {
              const newImp = minions[Math.floor(Math.random() * minions.length)];
              const newImpIdx = newPlayers.findIndex(p => p.id === newImp.id);
              newPlayers[newImpIdx] = { ...newPlayers[newImpIdx], role: 'imp', actualRole: 'imp', perceivedRole: 'imp' };
              newPlayers[targetIdx] = { ...newPlayers[targetIdx], alive: false, diedAtNight: true };
              newState.nightDeaths = [...(newState.nightDeaths || []), target.id];
              newState.gameLog = [...newState.gameLog, logEntry(`Imp self-killed. ${newImp.name} becomes the new Imp`)];
            }
          } else {
            // Normal kill
            const targetRole = getRoleById(target.role);
            const isSoldier = target.role === 'soldier' && !target.poisoned && !target.drunk;
            const isProtected = target.protected;

            if (!isSoldier && !isProtected) {
              // Mayor bounce
              if (target.role === 'mayor' && !target.poisoned && !target.drunk) {
                const others = newPlayers.filter(p =>
                  p.alive && p.id !== target.id && !p.protected
                );
                if (others.length > 0) {
                  const bounceTarget = others[Math.floor(Math.random() * others.length)];
                  const bounceIdx = newPlayers.findIndex(p => p.id === bounceTarget.id);
                  newPlayers[bounceIdx] = { ...newPlayers[bounceIdx], alive: false, diedAtNight: true };
                  newState.nightDeaths = [...(newState.nightDeaths || []), bounceTarget.id];
                  newState.gameLog = [...newState.gameLog, logEntry(`Imp attacked Mayor. ${bounceTarget.name} died instead`)];
                  break;
                }
              }

              newPlayers[targetIdx] = { ...newPlayers[targetIdx], alive: false, diedAtNight: true };
              newState.nightDeaths = [...(newState.nightDeaths || []), target.id];
              newState.gameLog = [...newState.gameLog, logEntry(`Imp killed ${target.name}`)];
            } else {
              newState.gameLog = [...newState.gameLog, logEntry(`Imp attacked ${target.name} but they were protected`)];
            }
          }
        }
      }
      break;
    }

    // === SECTS & VIOLETS ===
    case 'clockmaker': {
      const distance = isPoisonedOrDrunk
        ? Math.floor(Math.random() * newPlayers.length)
        : calculateDemonMinionDistance(newPlayers);
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        nightInfo: { type: 'number', label: 'Steps from Demon to nearest Minion', value: distance },
      };
      newState.gameLog = [...newState.gameLog, logEntry(`Clockmaker learned distance: ${distance}`)];
      break;
    }

    case 'dreamer': {
      if (action.targetId) {
        const target = newPlayers.find(p => p.id === action.targetId);
        if (target) {
          const targetRole = getRoleById(target.role);
          const goodRoles = Object.values(ALL_ROLES).filter(r => r.team === Team.GOOD && r.type !== RoleType.TRAVELLER && r.type !== RoleType.FABLED);
          const evilRoles = Object.values(ALL_ROLES).filter(r => r.team === Team.EVIL && r.type !== RoleType.TRAVELLER && r.type !== RoleType.FABLED);
          let correctRole = targetRole?.name || 'Unknown';
          let falseRole;
          if (targetRole?.team === Team.GOOD) {
            falseRole = evilRoles[Math.floor(Math.random() * evilRoles.length)]?.name || 'Imp';
          } else {
            falseRole = goodRoles[Math.floor(Math.random() * goodRoles.length)]?.name || 'Washerwoman';
          }
          if (isPoisonedOrDrunk) {
            falseRole = goodRoles[Math.floor(Math.random() * goodRoles.length)]?.name;
            correctRole = evilRoles[Math.floor(Math.random() * evilRoles.length)]?.name;
          }
          const pair = Math.random() > 0.5 ? [correctRole, falseRole] : [falseRole, correctRole];
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            nightInfo: { type: 'twoPossible', label: `${target.name} is one of`, value: pair },
          };
        }
      }
      break;
    }

    case 'snake_charmer': {
      if (action.targetId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          const target = newPlayers[targetIdx];
          const targetRole = getRoleById(target.role);
          if (targetRole?.type === RoleType.DEMON && !isPoisonedOrDrunk) {
            // Swap: snake charmer becomes demon, demon becomes snake charmer
            const oldDemonRole = target.role;
            newPlayers[targetIdx] = { ...target, role: 'snake_charmer', actualRole: 'snake_charmer', perceivedRole: 'snake_charmer' };
            newPlayers[playerIndex] = { ...newPlayers[playerIndex], role: oldDemonRole, actualRole: oldDemonRole, perceivedRole: oldDemonRole };
            // Poison a good player
            const goodAlive = newPlayers.filter(p => getRoleById(p.role)?.team === Team.GOOD && p.alive);
            if (goodAlive.length > 0) {
              const poisonTarget = goodAlive[Math.floor(Math.random() * goodAlive.length)];
              const poisonIdx = newPlayers.findIndex(p => p.id === poisonTarget.id);
              newPlayers[poisonIdx] = { ...newPlayers[poisonIdx], poisoned: true };
            }
            newState.gameLog = [...newState.gameLog, logEntry(`Snake Charmer found the Demon! Roles swapped.`)];
          }
        }
      }
      break;
    }

    case 'mathematician': {
      const abnormalCount = isPoisonedOrDrunk ? Math.floor(Math.random() * 3) : 0; // simplified
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        nightInfo: { type: 'number', label: 'Abilities malfunctioned', value: abnormalCount },
      };
      break;
    }

    case 'flowergirl': {
      const demonVoted = !isPoisonedOrDrunk
        ? gameState.nominations.some(n => {
            const voter = newPlayers.find(p => p.id === n.voterId);
            return voter && getRoleById(voter.role)?.type === RoleType.DEMON;
          })
        : Math.random() > 0.5;
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        nightInfo: { type: 'yesno', label: 'Did the Demon vote today?', value: demonVoted },
      };
      break;
    }

    case 'town_crier': {
      const minionNominated = !isPoisonedOrDrunk
        ? gameState.nominations.some(n => {
            const nominator = newPlayers.find(p => p.id === n.nominatorId);
            return nominator && getRoleById(nominator.role)?.type === RoleType.MINION;
          })
        : Math.random() > 0.5;
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        nightInfo: { type: 'yesno', label: 'Did a Minion nominate today?', value: minionNominated },
      };
      break;
    }

    case 'oracle': {
      const deadEvil = isPoisonedOrDrunk
        ? Math.floor(Math.random() * 3)
        : newPlayers.filter(p => !p.alive && getRoleById(p.role)?.team === Team.EVIL).length;
      newPlayers[playerIndex] = {
        ...newPlayers[playerIndex],
        nightInfo: { type: 'number', label: 'Dead evil players', value: deadEvil },
      };
      break;
    }

    case 'seamstress': {
      if (action.targetIds && action.targetIds.length === 2 && !player.usedOncePerGameAbility) {
        const p1 = newPlayers.find(p => p.id === action.targetIds[0]);
        const p2 = newPlayers.find(p => p.id === action.targetIds[1]);
        if (p1 && p2) {
          const t1 = getRoleById(p1.role)?.team;
          const t2 = getRoleById(p2.role)?.team;
          const sameAlignment = isPoisonedOrDrunk ? Math.random() > 0.5 : (t1 === t2);
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            usedOncePerGameAbility: true,
            nightInfo: { type: 'yesno', label: `${p1.name} and ${p2.name} same alignment?`, value: sameAlignment },
          };
        }
      }
      break;
    }

    case 'witch': {
      if (action.targetId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          newPlayers[targetIdx] = {
            ...newPlayers[targetIdx],
            reminders: [...(newPlayers[targetIdx].reminders || []), 'Cursed'],
          };
          newState.gameLog = [...newState.gameLog, logEntry(`Witch cursed ${newPlayers[targetIdx].name}`)];
        }
      }
      break;
    }

    case 'cerenovus': {
      if (action.targetId && action.characterId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          newPlayers[targetIdx] = {
            ...newPlayers[targetIdx],
            reminders: [...(newPlayers[targetIdx].reminders || []), `Mad:${action.characterId}`],
          };
          newState.gameLog = [...newState.gameLog, logEntry(`Cerenovus made ${newPlayers[targetIdx].name} mad`)];
        }
      }
      break;
    }

    case 'pit_hag': {
      if (action.targetId && action.characterId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          newPlayers[targetIdx] = {
            ...newPlayers[targetIdx],
            role: action.characterId,
            actualRole: action.characterId,
            perceivedRole: action.characterId,
          };
          newState.gameLog = [...newState.gameLog, logEntry(`Pit-Hag changed ${newPlayers[targetIdx].name} to ${action.characterId}`)];
        }
      }
      break;
    }

    case 'fang_gu':
    case 'vigormortis':
    case 'no_dashii':
    case 'vortox': {
      if (action.targetId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          const target = newPlayers[targetIdx];

          // Fang Gu special: first outsider killed becomes Fang Gu
          if (roleId === 'fang_gu' && getRoleById(target.role)?.type === RoleType.OUTSIDER) {
            const hasUsedOnce = player.reminders?.includes('Once');
            if (!hasUsedOnce) {
              newPlayers[targetIdx] = { ...target, role: 'fang_gu', actualRole: 'fang_gu', perceivedRole: 'fang_gu' };
              newPlayers[playerIndex] = { ...newPlayers[playerIndex], alive: false, diedAtNight: true, reminders: [...(player.reminders || []), 'Once'] };
              newState.nightDeaths = [...(newState.nightDeaths || []), player.id];
              newState.gameLog = [...newState.gameLog, logEntry(`Fang Gu attacked Outsider ${target.name}. ${target.name} becomes new Fang Gu.`)];
              break;
            }
          }

          if (!target.protected) {
            newPlayers[targetIdx] = { ...target, alive: false, diedAtNight: true };
            newState.nightDeaths = [...(newState.nightDeaths || []), target.id];
            newState.gameLog = [...newState.gameLog, logEntry(`${role.name} killed ${target.name}`)];
          }

          // No Dashii poisons townsfolk neighbors
          if (roleId === 'no_dashii') {
            const neighbors = getAliveNeighbors(newPlayers, playerIndex);
            for (const n of neighbors) {
              if (getRoleById(n.role)?.type === RoleType.TOWNSFOLK) {
                const nIdx = newPlayers.findIndex(p => p.id === n.id);
                newPlayers[nIdx] = { ...newPlayers[nIdx], poisoned: true };
              }
            }
          }
        }
      }
      break;
    }

    // === BAD MOON RISING ===
    case 'grandmother': {
      if (!isPoisonedOrDrunk) {
        const goodPlayers = newPlayers.filter(p =>
          getRoleById(p.role)?.team === Team.GOOD && p.id !== player.id && p.alive
        );
        if (goodPlayers.length > 0) {
          const grandchild = goodPlayers[Math.floor(Math.random() * goodPlayers.length)];
          const grandchildRole = getRoleById(grandchild.role);
          newPlayers[playerIndex] = {
            ...newPlayers[playerIndex],
            nightInfo: { type: 'playerRole', label: 'Your grandchild', value: { name: grandchild.name, role: grandchildRole?.name } },
            reminders: [...(player.reminders || []), `Grandchild:${grandchild.id}`],
          };
        }
      }
      break;
    }

    case 'sailor': {
      if (action.targetId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          // Randomly drunk one of them
          if (Math.random() > 0.5) {
            newPlayers[targetIdx] = { ...newPlayers[targetIdx], drunk: true };
          } else {
            newPlayers[playerIndex] = { ...newPlayers[playerIndex], drunk: true };
          }
        }
      }
      break;
    }

    case 'chambermaid': {
      if (action.targetIds && action.targetIds.length === 2) {
        let wokeCount = 0;
        if (!isPoisonedOrDrunk) {
          for (const tid of action.targetIds) {
            const t = newPlayers.find(p => p.id === tid);
            if (t) {
              const tRole = getRoleById(t.role);
              if (tRole?.otherNightOrder || tRole?.firstNightOrder) wokeCount++;
            }
          }
        } else {
          wokeCount = Math.floor(Math.random() * 3);
        }
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          nightInfo: { type: 'number', label: 'Players who woke tonight', value: wokeCount },
        };
      }
      break;
    }

    case 'exorcist': {
      if (action.targetId) {
        const target = newPlayers.find(p => p.id === action.targetId);
        if (target && getRoleById(target.role)?.type === RoleType.DEMON && !isPoisonedOrDrunk) {
          // Demon doesn't wake - skip their kill
          newState.exorcistBlockedDemon = true;
          newState.gameLog = [...newState.gameLog, logEntry(`Exorcist chose the Demon! Demon doesn't wake.`)];
        }
      }
      break;
    }

    case 'innkeeper': {
      if (action.targetIds && action.targetIds.length === 2 && !isPoisonedOrDrunk) {
        for (const tid of action.targetIds) {
          const idx = newPlayers.findIndex(p => p.id === tid);
          if (idx >= 0) {
            newPlayers[idx] = { ...newPlayers[idx], protected: true };
          }
        }
        // One becomes drunk
        const drunkIdx = newPlayers.findIndex(p => p.id === action.targetIds[Math.floor(Math.random() * 2)]);
        if (drunkIdx >= 0) {
          newPlayers[drunkIdx] = { ...newPlayers[drunkIdx], drunk: true };
        }
      }
      break;
    }

    case 'gambler': {
      if (action.targetId && action.guessedRole) {
        const target = newPlayers.find(p => p.id === action.targetId);
        if (target && !isPoisonedOrDrunk) {
          if (target.role !== action.guessedRole) {
            newPlayers[playerIndex] = { ...newPlayers[playerIndex], alive: false, diedAtNight: true };
            newState.nightDeaths = [...(newState.nightDeaths || []), player.id];
            newState.gameLog = [...newState.gameLog, logEntry(`Gambler guessed wrong and died`)];
          }
        }
      }
      break;
    }

    case 'courtier': {
      if (action.targetId && !player.usedOncePerGameAbility) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0 && !isPoisonedOrDrunk) {
          newPlayers[targetIdx] = { ...newPlayers[targetIdx], drunk: true };
          newPlayers[playerIndex] = { ...newPlayers[playerIndex], usedOncePerGameAbility: true };
          newState.gameLog = [...newState.gameLog, logEntry(`Courtier made ${newPlayers[targetIdx].name} drunk for 3 days`)];
        }
      }
      break;
    }

    case 'professor': {
      if (action.targetId && !player.usedOncePerGameAbility) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0 && !isPoisonedOrDrunk) {
          const target = newPlayers[targetIdx];
          if (!target.alive && getRoleById(target.role)?.type === RoleType.TOWNSFOLK) {
            newPlayers[targetIdx] = { ...target, alive: true, diedAtNight: false };
            newPlayers[playerIndex] = { ...newPlayers[playerIndex], usedOncePerGameAbility: true };
            newState.gameLog = [...newState.gameLog, logEntry(`Professor resurrected ${target.name}`)];
          }
        }
      }
      break;
    }

    case 'gossip': {
      if (action.statementTrue && !isPoisonedOrDrunk) {
        // If the gossip's statement was true, someone dies
        const alivePlayers = newPlayers.filter(p => p.alive && p.id !== player.id);
        if (alivePlayers.length > 0) {
          const victim = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
          const victimIdx = newPlayers.findIndex(p => p.id === victim.id);
          newPlayers[victimIdx] = { ...newPlayers[victimIdx], alive: false, diedAtNight: true };
          newState.nightDeaths = [...(newState.nightDeaths || []), victim.id];
          newState.gameLog = [...newState.gameLog, logEntry(`Gossip's statement was true! ${victim.name} died.`)];
        }
      }
      break;
    }

    case 'lunatic': {
      // Lunatic thinks they're the demon - their choice is shown to the real demon
      if (action.targetId) {
        newState.lunaticChoice = action.targetId;
        newState.gameLog = [...newState.gameLog, logEntry(`Lunatic chose ${newPlayers.find(p => p.id === action.targetId)?.name}`)];
      }
      break;
    }

    case 'godfather': {
      if (action.targetId) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0 && !newPlayers[targetIdx].alive && !isPoisonedOrDrunk) {
          // Only kills if an outsider died today
          const outsiderDiedToday = newPlayers.some(p =>
            p.diedToday && getRoleById(p.role)?.type === RoleType.OUTSIDER
          );
          if (outsiderDiedToday) {
            // Kill a dead player (they die again - represents removing from game essentially)
            newState.gameLog = [...newState.gameLog, logEntry(`Godfather targeted ${newPlayers[targetIdx].name}`)];
          }
        }
      }
      break;
    }

    case 'devils_advocate': {
      if (action.targetId && !isPoisonedOrDrunk) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          newPlayers[targetIdx] = {
            ...newPlayers[targetIdx],
            reminders: [...(newPlayers[targetIdx].reminders || []), 'Survives execution'],
          };
          newState.gameLog = [...newState.gameLog, logEntry(`Devil's Advocate protected ${newPlayers[targetIdx].name} from execution`)];
        }
      }
      break;
    }

    case 'assassin': {
      if (action.targetId && !player.usedOncePerGameAbility) {
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          // Assassin kills bypass all protection
          newPlayers[targetIdx] = { ...newPlayers[targetIdx], alive: false, diedAtNight: true };
          newPlayers[playerIndex] = { ...newPlayers[playerIndex], usedOncePerGameAbility: true };
          newState.nightDeaths = [...(newState.nightDeaths || []), newPlayers[targetIdx].id];
          newState.gameLog = [...newState.gameLog, logEntry(`Assassin killed ${newPlayers[targetIdx].name}`)];
        }
      }
      break;
    }

    case 'zombuul': {
      // Only kills if no one died today
      if (action.targetId) {
        const someOneDiedToday = newPlayers.some(p => p.diedToday);
        if (!someOneDiedToday) {
          const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
          if (targetIdx >= 0 && !newPlayers[targetIdx].protected) {
            newPlayers[targetIdx] = { ...newPlayers[targetIdx], alive: false, diedAtNight: true };
            newState.nightDeaths = [...(newState.nightDeaths || []), newPlayers[targetIdx].id];
            newState.gameLog = [...newState.gameLog, logEntry(`Zombuul killed ${newPlayers[targetIdx].name}`)];
          }
        }
      }
      break;
    }

    case 'pukka': {
      if (action.targetId) {
        // Previous poisoned player dies, new target is poisoned
        const prevPoisoned = newPlayers.findIndex(p =>
          p.reminders?.includes('Pukka poisoned')
        );
        if (prevPoisoned >= 0) {
          newPlayers[prevPoisoned] = {
            ...newPlayers[prevPoisoned],
            alive: false,
            diedAtNight: true,
            reminders: newPlayers[prevPoisoned].reminders.filter(r => r !== 'Pukka poisoned'),
          };
          newState.nightDeaths = [...(newState.nightDeaths || []), newPlayers[prevPoisoned].id];
        }
        const targetIdx = newPlayers.findIndex(p => p.id === action.targetId);
        if (targetIdx >= 0) {
          newPlayers[targetIdx] = {
            ...newPlayers[targetIdx],
            poisoned: true,
            reminders: [...(newPlayers[targetIdx].reminders || []), 'Pukka poisoned'],
          };
        }
      }
      break;
    }

    case 'shabaloth': {
      if (action.targetIds && action.targetIds.length <= 2) {
        for (const tid of action.targetIds) {
          const idx = newPlayers.findIndex(p => p.id === tid);
          if (idx >= 0 && !newPlayers[idx].protected) {
            newPlayers[idx] = { ...newPlayers[idx], alive: false, diedAtNight: true };
            newState.nightDeaths = [...(newState.nightDeaths || []), newPlayers[idx].id];
          }
        }
        newState.gameLog = [...newState.gameLog, logEntry(`Shabaloth killed ${action.targetIds.length} players`)];
      }
      break;
    }

    case 'po': {
      if (action.pass) {
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          reminders: [...(player.reminders || []), '3 attacks'],
        };
        newState.gameLog = [...newState.gameLog, logEntry(`Po chose no one. Next night: 3 attacks.`)];
      } else if (action.targetIds) {
        const maxTargets = player.reminders?.includes('3 attacks') ? 3 : 1;
        const targets = action.targetIds.slice(0, maxTargets);
        for (const tid of targets) {
          const idx = newPlayers.findIndex(p => p.id === tid);
          if (idx >= 0 && !newPlayers[idx].protected) {
            newPlayers[idx] = { ...newPlayers[idx], alive: false, diedAtNight: true };
            newState.nightDeaths = [...(newState.nightDeaths || []), newPlayers[idx].id];
          }
        }
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          reminders: (player.reminders || []).filter(r => r !== '3 attacks'),
        };
        newState.gameLog = [...newState.gameLog, logEntry(`Po killed ${targets.length} players`)];
      }
      break;
    }

    default:
      break;
  }

  newState.players = newPlayers;
  newState.nightActions = [
    ...(newState.nightActions || []),
    { roleId, action, timestamp: Date.now() },
  ];

  return newState;
}

export function advanceNightAction(gameState) {
  const nightOrder = getNightOrder(gameState);
  const nextIndex = gameState.nightActionIndex + 1;

  if (nextIndex >= nightOrder.length) {
    // Night is over, transition to day
    return endNight(gameState);
  }

  return {
    ...gameState,
    nightActionIndex: nextIndex,
    pendingNightAction: nightOrder[nextIndex],
  };
}

export function endNight(gameState) {
  const deaths = gameState.nightDeaths || [];
  const deadNames = deaths.map(id =>
    gameState.players.find(p => p.id === id)?.name
  ).filter(Boolean);

  return {
    ...gameState,
    phase: Phase.DAY,
    dayNumber: gameState.dayNumber + 1,
    isFirstNight: false,
    pendingNightAction: null,
    nightActionIndex: 0,
    exorcistBlockedDemon: false,
    players: gameState.players.map(p => ({
      ...p,
      diedToday: false,
      executedToday: false,
      hasBeenNominated: false,
      hasNominated: false,
      nominations: 0,
      reminders: (p.reminders || []).filter(r =>
        !r.startsWith('Cursed') && r !== 'Survives execution'
      ),
    })),
    nominations: [],
    currentNomination: null,
    votes: {},
    executionTarget: null,
    executionVotes: 0,
    voteThreshold: Math.ceil(gameState.players.filter(p => p.alive).length / 2),
    gameLog: [
      ...gameState.gameLog,
      {
        type: 'phase',
        message: deaths.length > 0
          ? `Dawn breaks. ${deadNames.join(' and ')} died in the night.`
          : 'Dawn breaks. No one died in the night.',
        timestamp: Date.now(),
      },
    ],
  };
}

// ============================================================
// DAY PHASE
// ============================================================

export function nominate(gameState, nominatorId, nomineeId) {
  const nominator = gameState.players.find(p => p.id === nominatorId);
  const nominee = gameState.players.find(p => p.id === nomineeId);

  if (!nominator || !nominee) return gameState;
  if (!nominator.alive) return gameState;
  if (nominator.hasNominated) return gameState;

  // Check for Virgin ability
  let newState = { ...gameState };
  let newPlayers = [...newState.players];

  if (nominee.role === 'virgin' && !nominee.usedOncePerGameAbility) {
    const nominatorRole = getRoleById(nominator.role);
    const nomineeIdx = newPlayers.findIndex(p => p.id === nomineeId);
    newPlayers[nomineeIdx] = { ...newPlayers[nomineeIdx], usedOncePerGameAbility: true };

    if (nominatorRole?.type === RoleType.TOWNSFOLK && !nominee.poisoned && !nominee.drunk) {
      // Nominator is executed immediately
      const nominatorIdx = newPlayers.findIndex(p => p.id === nominatorId);
      newPlayers[nominatorIdx] = {
        ...newPlayers[nominatorIdx],
        alive: false,
        diedToday: true,
        executedToday: true,
        hasNominated: true,
      };
      newState.players = newPlayers;
      newState.gameLog = [
        ...newState.gameLog,
        { type: 'day', message: `${nominator.name} nominated the Virgin! ${nominator.name} is executed.`, timestamp: Date.now() },
      ];
      return checkWinConditions(newState);
    }
  }

  // Check for Witch curse
  if (nominator.reminders?.includes('Cursed')) {
    const nominatorIdx = newPlayers.findIndex(p => p.id === nominatorId);
    const aliveCount = newPlayers.filter(p => p.alive).length;
    if (aliveCount > 3) {
      newPlayers[nominatorIdx] = {
        ...newPlayers[nominatorIdx],
        alive: false,
        diedToday: true,
        hasNominated: true,
      };
      newState.players = newPlayers;
      newState.gameLog = [
        ...newState.gameLog,
        { type: 'day', message: `${nominator.name} nominated and was struck by the Witch's curse! They die.`, timestamp: Date.now() },
      ];
      return checkWinConditions(newState);
    }
  }

  // Normal nomination
  const nominatorIdx = newPlayers.findIndex(p => p.id === nominatorId);
  const nomineeIdx = newPlayers.findIndex(p => p.id === nomineeId);
  newPlayers[nominatorIdx] = { ...newPlayers[nominatorIdx], hasNominated: true };
  newPlayers[nomineeIdx] = { ...newPlayers[nomineeIdx], hasBeenNominated: true, nominations: (newPlayers[nomineeIdx].nominations || 0) + 1 };

  const nomination = {
    id: generateId(),
    nominatorId,
    nomineeId,
    nominatorName: nominator.name,
    nomineeName: nominee.name,
    votes: {},
    voteCount: 0,
    timestamp: Date.now(),
  };

  return {
    ...newState,
    players: newPlayers,
    currentNomination: nomination,
    nominations: [...newState.nominations, nomination],
    phase: Phase.VOTING,
    gameLog: [
      ...newState.gameLog,
      { type: 'day', message: `${nominator.name} nominated ${nominee.name}.`, timestamp: Date.now() },
    ],
  };
}

export function castVote(gameState, playerId, votesYes) {
  if (!gameState.currentNomination) return gameState;

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return gameState;

  // Dead players can only vote once (ghost vote)
  if (!player.alive && player.ghostVoteUsed) return gameState;

  // Butler can only vote if their master votes
  if (player.butlerMaster && votesYes) {
    const masterVote = gameState.currentNomination.votes[player.butlerMaster];
    if (!masterVote) return gameState; // master hasn't voted yes
  }

  const newNomination = {
    ...gameState.currentNomination,
    votes: {
      ...gameState.currentNomination.votes,
      [playerId]: votesYes,
    },
  };

  const yesVotes = Object.entries(newNomination.votes)
    .filter(([, v]) => v)
    .reduce((sum, [pid]) => {
      const p = gameState.players.find(pl => pl.id === pid);
      return sum + (p?.voteWeight || 1);
    }, 0);

  newNomination.voteCount = yesVotes;

  let newPlayers = [...gameState.players];
  if (!player.alive && votesYes) {
    const pidx = newPlayers.findIndex(p => p.id === playerId);
    newPlayers[pidx] = { ...newPlayers[pidx], ghostVoteUsed: true };
  }

  return {
    ...gameState,
    players: newPlayers,
    currentNomination: newNomination,
    nominations: gameState.nominations.map(n =>
      n.id === newNomination.id ? newNomination : n
    ),
  };
}

export function resolveVote(gameState) {
  if (!gameState.currentNomination) return gameState;

  const nomination = gameState.currentNomination;
  const yesVotes = nomination.voteCount;

  let newState = { ...gameState };

  if (yesVotes >= gameState.voteThreshold && yesVotes > gameState.executionVotes) {
    newState.executionTarget = nomination.nomineeId;
    newState.executionVotes = yesVotes;
    newState.gameLog = [
      ...newState.gameLog,
      { type: 'day', message: `Vote passes with ${yesVotes} votes. ${nomination.nomineeName} is about to be executed.`, timestamp: Date.now() },
    ];
  } else if (yesVotes >= gameState.voteThreshold && yesVotes === gameState.executionVotes) {
    // Tie - no execution
    newState.executionTarget = null;
    newState.executionVotes = yesVotes;
    newState.gameLog = [
      ...newState.gameLog,
      { type: 'day', message: `Vote ties at ${yesVotes}. No execution will occur (tied).`, timestamp: Date.now() },
    ];
  } else {
    newState.gameLog = [
      ...newState.gameLog,
      { type: 'day', message: `Vote fails with ${yesVotes} votes (needed ${gameState.voteThreshold}).`, timestamp: Date.now() },
    ];
  }

  newState.currentNomination = null;
  newState.phase = Phase.DAY;
  return newState;
}

export function executePlayer(gameState) {
  if (!gameState.executionTarget) return gameState;

  const targetId = gameState.executionTarget;
  const target = gameState.players.find(p => p.id === targetId);
  if (!target) return gameState;

  let newPlayers = [...gameState.players];
  const targetIdx = newPlayers.findIndex(p => p.id === targetId);

  // Check for Devil's Advocate protection
  if (target.reminders?.includes('Survives execution')) {
    newPlayers[targetIdx] = {
      ...newPlayers[targetIdx],
      executedToday: true,
      reminders: target.reminders.filter(r => r !== 'Survives execution'),
    };
    return {
      ...gameState,
      players: newPlayers,
      executionTarget: null,
      executionVotes: 0,
      gameLog: [
        ...gameState.gameLog,
        { type: 'day', message: `${target.name} was executed but did not die!`, timestamp: Date.now() },
      ],
    };
  }

  // Check for Saint
  if (target.role === 'saint' && !target.poisoned && !target.drunk) {
    newPlayers[targetIdx] = { ...newPlayers[targetIdx], alive: false, diedToday: true, executedToday: true };
    return checkWinConditions({
      ...gameState,
      players: newPlayers,
      executionTarget: null,
      executionVotes: 0,
      winner: Team.EVIL,
      gameLog: [
        ...gameState.gameLog,
        { type: 'day', message: `${target.name} the Saint was executed! Evil wins!`, timestamp: Date.now() },
      ],
    });
  }

  // Check for Pacifist (might save good players)
  const pacifist = newPlayers.find(p => p.role === 'pacifist' && p.alive && !p.poisoned && !p.drunk);
  if (pacifist && getRoleById(target.role)?.team === Team.GOOD) {
    if (Math.random() > 0.5) { // Storyteller decides
      return {
        ...gameState,
        executionTarget: null,
        executionVotes: 0,
        gameLog: [
          ...gameState.gameLog,
          { type: 'day', message: `${target.name} was executed but the Pacifist saved them!`, timestamp: Date.now() },
        ],
      };
    }
  }

  // Normal execution
  newPlayers[targetIdx] = { ...newPlayers[targetIdx], alive: false, diedToday: true, executedToday: true };

  // Scarlet Woman check
  const targetRole = getRoleById(target.role);
  if (targetRole?.type === RoleType.DEMON) {
    const aliveCount = newPlayers.filter(p => p.alive).length;
    const scarletWoman = newPlayers.find(p =>
      p.role === 'scarlet_woman' && p.alive && !p.poisoned && !p.drunk
    );
    if (scarletWoman && aliveCount >= 5) {
      const swIdx = newPlayers.findIndex(p => p.id === scarletWoman.id);
      newPlayers[swIdx] = { ...newPlayers[swIdx], role: target.role, actualRole: target.role, perceivedRole: target.role };
      return {
        ...gameState,
        players: newPlayers,
        executionTarget: null,
        executionVotes: 0,
        gameLog: [
          ...gameState.gameLog,
          { type: 'day', message: `${target.name} was executed.`, timestamp: Date.now() },
          { type: 'day', message: `The Scarlet Woman becomes the new Demon.`, timestamp: Date.now(), private: true },
        ],
      };
    }

    // Mastermind check
    const mastermind = newPlayers.find(p =>
      p.role === 'mastermind' && p.alive && !p.poisoned && !p.drunk
    );
    if (mastermind) {
      return {
        ...gameState,
        players: newPlayers,
        executionTarget: null,
        executionVotes: 0,
        mastermindExtraDay: true,
        gameLog: [
          ...gameState.gameLog,
          { type: 'day', message: `${target.name} was executed. But the game continues...`, timestamp: Date.now() },
        ],
      };
    }
  }

  // Minstrel check: if a minion was executed, everyone drunk
  if (getRoleById(target.role)?.type === RoleType.MINION) {
    const minstrel = newPlayers.find(p => p.role === 'minstrel' && p.alive && !p.poisoned);
    if (minstrel) {
      newPlayers = newPlayers.map(p => ({
        ...p,
        drunk: p.alive ? true : p.drunk,
      }));
    }
  }

  let newState = {
    ...gameState,
    players: newPlayers,
    executionTarget: null,
    executionVotes: 0,
    gameLog: [
      ...gameState.gameLog,
      { type: 'day', message: `${target.name} was executed.`, timestamp: Date.now() },
    ],
  };

  return checkWinConditions(newState);
}

export function skipExecution(gameState) {
  // Mayor win check: if 3 players alive and no execution
  const alivePlayers = gameState.players.filter(p => p.alive);
  const mayor = gameState.players.find(p =>
    p.role === 'mayor' && p.alive && !p.poisoned && !p.drunk
  );

  if (alivePlayers.length === 3 && mayor) {
    return {
      ...gameState,
      winner: Team.GOOD,
      phase: Phase.GAME_OVER,
      gameLog: [
        ...gameState.gameLog,
        { type: 'day', message: `No execution with 3 players alive. The Mayor's team wins!`, timestamp: Date.now() },
      ],
    };
  }

  // Vortox: if no execution, evil wins
  const vortox = gameState.players.find(p =>
    p.role === 'vortox' && p.alive
  );
  if (vortox) {
    return {
      ...gameState,
      winner: Team.EVIL,
      phase: Phase.GAME_OVER,
      gameLog: [
        ...gameState.gameLog,
        { type: 'day', message: `No execution occurred. Vortox's ability triggers - evil wins!`, timestamp: Date.now() },
      ],
    };
  }

  return {
    ...gameState,
    executionTarget: null,
    executionVotes: 0,
    gameLog: [
      ...gameState.gameLog,
      { type: 'day', message: `No execution today.`, timestamp: Date.now() },
    ],
  };
}

export function useSlayerAbility(gameState, slayerId, targetId) {
  const slayer = gameState.players.find(p => p.id === slayerId);
  if (!slayer || slayer.role !== 'slayer' || slayer.usedOncePerGameAbility) return gameState;

  let newPlayers = [...gameState.players];
  const slayerIdx = newPlayers.findIndex(p => p.id === slayerId);
  newPlayers[slayerIdx] = { ...newPlayers[slayerIdx], usedOncePerGameAbility: true };

  const target = newPlayers.find(p => p.id === targetId);
  if (!target) return { ...gameState, players: newPlayers };

  const targetRole = getRoleById(target.role);
  if (targetRole?.type === RoleType.DEMON && !slayer.poisoned && !slayer.drunk) {
    const targetIdx = newPlayers.findIndex(p => p.id === targetId);
    newPlayers[targetIdx] = { ...newPlayers[targetIdx], alive: false, diedToday: true };

    return checkWinConditions({
      ...gameState,
      players: newPlayers,
      gameLog: [
        ...gameState.gameLog,
        { type: 'day', message: `${slayer.name} used the Slayer ability on ${target.name}. ${target.name} dies!`, timestamp: Date.now() },
      ],
    });
  }

  return {
    ...gameState,
    players: newPlayers,
    gameLog: [
      ...gameState.gameLog,
      { type: 'day', message: `${slayer.name} used the Slayer ability on ${target.name}. Nothing happens.`, timestamp: Date.now() },
    ],
  };
}

export function startNextNight(gameState) {
  return startNightPhase({
    ...gameState,
    nightNumber: gameState.nightNumber + 1,
  });
}

// ============================================================
// WIN CONDITIONS
// ============================================================

export function checkWinConditions(gameState) {
  if (gameState.winner) return gameState;

  const alivePlayers = gameState.players.filter(p => p.alive);
  const aliveDemon = alivePlayers.find(p =>
    getRoleById(p.role)?.type === RoleType.DEMON
  );

  // Evil wins: only 2 players remain (and one is the demon)
  if (alivePlayers.length <= 2 && aliveDemon) {
    return {
      ...gameState,
      winner: Team.EVIL,
      phase: Phase.GAME_OVER,
      gameLog: [
        ...gameState.gameLog,
        { type: 'gameOver', message: 'Evil wins! Too few players remain.', timestamp: Date.now() },
      ],
    };
  }

  // Good wins: demon is dead (and no Scarlet Woman / Mastermind takeover)
  if (!aliveDemon) {
    // Check for Zombuul (dies once, appears dead but isn't)
    const zombuul = gameState.players.find(p =>
      p.role === 'zombuul' && !p.reminders?.includes('truly dead')
    );
    if (zombuul && !zombuul.reminders?.includes('truly dead')) {
      // Zombuul's first death - they appear dead but aren't really
      return gameState;
    }

    if (!gameState.mastermindExtraDay) {
      return {
        ...gameState,
        winner: Team.GOOD,
        phase: Phase.GAME_OVER,
        gameLog: [
          ...gameState.gameLog,
          { type: 'gameOver', message: 'Good wins! The Demon has been defeated!', timestamp: Date.now() },
        ],
      };
    }
  }

  return gameState;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateTwoPlayersOneIsInfo(players, targetRoleType, selfId) {
  const alivePlayers = players.filter(p => p.alive && p.id !== selfId);
  const targetPlayers = alivePlayers.filter(p => {
    const role = getRoleById(p.role);
    return role?.type === targetRoleType;
  });

  if (targetPlayers.length === 0) {
    return { type: 'none', label: 'No matching characters in play', value: null };
  }

  const target = targetPlayers[Math.floor(Math.random() * targetPlayers.length)];
  const others = alivePlayers.filter(p => p.id !== target.id);
  const decoy = others.length > 0
    ? others[Math.floor(Math.random() * others.length)]
    : target;

  const targetRole = getRoleById(target.role);
  const pair = Math.random() > 0.5
    ? [target.name, decoy.name]
    : [decoy.name, target.name];

  return {
    type: 'twoPlayersOneIs',
    label: `One of these is the ${targetRole?.name}`,
    value: { players: pair, role: targetRole?.name },
  };
}

function generateFalseTwoPlayersInfo(players, targetRoleType, selfId, gameState) {
  const alivePlayers = players.filter(p => p.alive && p.id !== selfId);
  if (alivePlayers.length < 2) return { type: 'none', label: 'Not enough players', value: null };

  const p1 = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  let p2 = p1;
  while (p2.id === p1.id && alivePlayers.length > 1) {
    p2 = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  }

  const script = SCRIPTS[gameState.scriptId];
  let rolePool;
  switch (targetRoleType) {
    case RoleType.TOWNSFOLK: rolePool = script.townsfolk; break;
    case RoleType.OUTSIDER: rolePool = script.outsiders; break;
    case RoleType.MINION: rolePool = script.minions; break;
    default: rolePool = script.townsfolk;
  }
  const falseRole = getRoleById(rolePool[Math.floor(Math.random() * rolePool.length)]);

  return {
    type: 'twoPlayersOneIs',
    label: `One of these is the ${falseRole?.name}`,
    value: { players: [p1.name, p2.name], role: falseRole?.name },
  };
}

function countEvilPairs(players) {
  let pairs = 0;
  const alivePlayers = players.filter(p => p.alive);
  for (let i = 0; i < alivePlayers.length; i++) {
    const curr = alivePlayers[i];
    const next = alivePlayers[(i + 1) % alivePlayers.length];
    const currRole = getRoleById(curr.role);
    const nextRole = getRoleById(next.role);
    if (currRole?.team === Team.EVIL && nextRole?.team === Team.EVIL) {
      pairs++;
    }
  }
  return pairs;
}

function countEvilNeighbors(players, playerIndex) {
  const alivePlayers = players.filter(p => p.alive);
  const me = players[playerIndex];
  const myAliveIdx = alivePlayers.findIndex(p => p.id === me.id);
  if (myAliveIdx < 0) return 0;

  let count = 0;
  const leftIdx = (myAliveIdx - 1 + alivePlayers.length) % alivePlayers.length;
  const rightIdx = (myAliveIdx + 1) % alivePlayers.length;

  const left = alivePlayers[leftIdx];
  const right = alivePlayers[rightIdx];

  if (left && getRoleById(left.role)?.team === Team.EVIL) count++;
  if (right && getRoleById(right.role)?.team === Team.EVIL) count++;

  return count;
}

function calculateDemonMinionDistance(players) {
  const alivePlayers = players.filter(p => p.alive);
  const demonIdx = alivePlayers.findIndex(p => getRoleById(p.role)?.type === RoleType.DEMON);
  if (demonIdx < 0) return 0;

  let minDist = alivePlayers.length;
  for (let i = 0; i < alivePlayers.length; i++) {
    if (getRoleById(alivePlayers[i].role)?.type === RoleType.MINION) {
      const clockwise = (i - demonIdx + alivePlayers.length) % alivePlayers.length;
      const counterClockwise = (demonIdx - i + alivePlayers.length) % alivePlayers.length;
      minDist = Math.min(minDist, clockwise, counterClockwise);
    }
  }
  return minDist;
}

function getAliveNeighbors(players, playerIndex) {
  const alivePlayers = players.filter(p => p.alive);
  const me = players[playerIndex];
  const myAliveIdx = alivePlayers.findIndex(p => p.id === me.id);
  if (myAliveIdx < 0) return [];

  const leftIdx = (myAliveIdx - 1 + alivePlayers.length) % alivePlayers.length;
  const rightIdx = (myAliveIdx + 1) % alivePlayers.length;

  return [alivePlayers[leftIdx], alivePlayers[rightIdx]].filter(Boolean);
}

// ============================================================
// STORYTELLER HELPERS
// ============================================================

export function storytellerSetRole(gameState, playerId, roleId) {
  const newPlayers = gameState.players.map(p =>
    p.id === playerId
      ? { ...p, role: roleId, actualRole: roleId, perceivedRole: roleId }
      : p
  );
  return { ...gameState, players: newPlayers };
}

export function storytellerKillPlayer(gameState, playerId) {
  const newPlayers = gameState.players.map(p =>
    p.id === playerId ? { ...p, alive: false } : p
  );
  return checkWinConditions({ ...gameState, players: newPlayers });
}

export function storytellerRevivePlayer(gameState, playerId) {
  const newPlayers = gameState.players.map(p =>
    p.id === playerId ? { ...p, alive: true, diedAtNight: false, diedToday: false } : p
  );
  return { ...gameState, players: newPlayers };
}

export function storytellerSetPoisoned(gameState, playerId, poisoned) {
  const newPlayers = gameState.players.map(p =>
    p.id === playerId ? { ...p, poisoned } : p
  );
  return { ...gameState, players: newPlayers };
}

export function storytellerSetDrunk(gameState, playerId, drunk) {
  const newPlayers = gameState.players.map(p =>
    p.id === playerId ? { ...p, drunk } : p
  );
  return { ...gameState, players: newPlayers };
}

export function storytellerAddReminder(gameState, playerId, reminder) {
  const newPlayers = gameState.players.map(p =>
    p.id === playerId ? { ...p, reminders: [...(p.reminders || []), reminder] } : p
  );
  return { ...gameState, players: newPlayers };
}

export function storytellerDeclareWinner(gameState, team) {
  return {
    ...gameState,
    winner: team,
    phase: Phase.GAME_OVER,
    gameLog: [
      ...gameState.gameLog,
      { type: 'gameOver', message: `Storyteller declared ${team} as the winner.`, timestamp: Date.now() },
    ],
  };
}
