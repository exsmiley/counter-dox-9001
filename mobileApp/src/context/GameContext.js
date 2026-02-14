import React, { createContext, useContext, useReducer, useCallback } from 'react';
import {
  createGame,
  assignRoles,
  startNightPhase,
  processNightAction,
  advanceNightAction,
  endNight,
  nominate,
  castVote,
  resolveVote,
  executePlayer,
  skipExecution,
  useSlayerAbility,
  startNextNight,
  checkWinConditions,
  storytellerSetRole,
  storytellerKillPlayer,
  storytellerRevivePlayer,
  storytellerSetPoisoned,
  storytellerSetDrunk,
  storytellerAddReminder,
  storytellerDeclareWinner,
} from '../game/GameEngine';
import { Phase } from '../game/roles';

const GameContext = createContext(null);

const ActionTypes = {
  CREATE_GAME: 'CREATE_GAME',
  ASSIGN_ROLES: 'ASSIGN_ROLES',
  START_NIGHT: 'START_NIGHT',
  NIGHT_ACTION: 'NIGHT_ACTION',
  ADVANCE_NIGHT: 'ADVANCE_NIGHT',
  END_NIGHT: 'END_NIGHT',
  NOMINATE: 'NOMINATE',
  CAST_VOTE: 'CAST_VOTE',
  RESOLVE_VOTE: 'RESOLVE_VOTE',
  EXECUTE: 'EXECUTE',
  SKIP_EXECUTION: 'SKIP_EXECUTION',
  USE_SLAYER: 'USE_SLAYER',
  START_NEXT_NIGHT: 'START_NEXT_NIGHT',
  ST_SET_ROLE: 'ST_SET_ROLE',
  ST_KILL: 'ST_KILL',
  ST_REVIVE: 'ST_REVIVE',
  ST_POISON: 'ST_POISON',
  ST_DRUNK: 'ST_DRUNK',
  ST_REMINDER: 'ST_REMINDER',
  ST_DECLARE_WINNER: 'ST_DECLARE_WINNER',
  LOAD_GAME: 'LOAD_GAME',
  RESET_GAME: 'RESET_GAME',
  SET_CURRENT_PLAYER: 'SET_CURRENT_PLAYER',
};

function gameReducer(state, action) {
  switch (action.type) {
    case ActionTypes.CREATE_GAME:
      return createGame(action.payload);
    case ActionTypes.ASSIGN_ROLES:
      return assignRoles(state);
    case ActionTypes.START_NIGHT:
      return startNightPhase(state);
    case ActionTypes.NIGHT_ACTION:
      return processNightAction(state, action.payload.roleId, action.payload.action);
    case ActionTypes.ADVANCE_NIGHT:
      return advanceNightAction(state);
    case ActionTypes.END_NIGHT:
      return endNight(state);
    case ActionTypes.NOMINATE:
      return nominate(state, action.payload.nominatorId, action.payload.nomineeId);
    case ActionTypes.CAST_VOTE:
      return castVote(state, action.payload.playerId, action.payload.votesYes);
    case ActionTypes.RESOLVE_VOTE:
      return resolveVote(state);
    case ActionTypes.EXECUTE:
      return executePlayer(state);
    case ActionTypes.SKIP_EXECUTION:
      return skipExecution(state);
    case ActionTypes.USE_SLAYER:
      return useSlayerAbility(state, action.payload.slayerId, action.payload.targetId);
    case ActionTypes.START_NEXT_NIGHT:
      return startNextNight(state);
    case ActionTypes.ST_SET_ROLE:
      return storytellerSetRole(state, action.payload.playerId, action.payload.roleId);
    case ActionTypes.ST_KILL:
      return storytellerKillPlayer(state, action.payload.playerId);
    case ActionTypes.ST_REVIVE:
      return storytellerRevivePlayer(state, action.payload.playerId);
    case ActionTypes.ST_POISON:
      return storytellerSetPoisoned(state, action.payload.playerId, action.payload.poisoned);
    case ActionTypes.ST_DRUNK:
      return storytellerSetDrunk(state, action.payload.playerId, action.payload.drunk);
    case ActionTypes.ST_REMINDER:
      return storytellerAddReminder(state, action.payload.playerId, action.payload.reminder);
    case ActionTypes.ST_DECLARE_WINNER:
      return storytellerDeclareWinner(state, action.payload.team);
    case ActionTypes.LOAD_GAME:
      return action.payload;
    case ActionTypes.RESET_GAME:
      return null;
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [gameState, dispatch] = useReducer(gameReducer, null);
  const [currentPlayerId, setCurrentPlayerId] = React.useState(null);

  const actions = {
    createGame: useCallback((payload) =>
      dispatch({ type: ActionTypes.CREATE_GAME, payload }), []),
    assignRoles: useCallback(() =>
      dispatch({ type: ActionTypes.ASSIGN_ROLES }), []),
    startNight: useCallback(() =>
      dispatch({ type: ActionTypes.START_NIGHT }), []),
    nightAction: useCallback((roleId, action) =>
      dispatch({ type: ActionTypes.NIGHT_ACTION, payload: { roleId, action } }), []),
    advanceNight: useCallback(() =>
      dispatch({ type: ActionTypes.ADVANCE_NIGHT }), []),
    endNight: useCallback(() =>
      dispatch({ type: ActionTypes.END_NIGHT }), []),
    nominate: useCallback((nominatorId, nomineeId) =>
      dispatch({ type: ActionTypes.NOMINATE, payload: { nominatorId, nomineeId } }), []),
    castVote: useCallback((playerId, votesYes) =>
      dispatch({ type: ActionTypes.CAST_VOTE, payload: { playerId, votesYes } }), []),
    resolveVote: useCallback(() =>
      dispatch({ type: ActionTypes.RESOLVE_VOTE }), []),
    execute: useCallback(() =>
      dispatch({ type: ActionTypes.EXECUTE }), []),
    skipExecution: useCallback(() =>
      dispatch({ type: ActionTypes.SKIP_EXECUTION }), []),
    useSlayer: useCallback((slayerId, targetId) =>
      dispatch({ type: ActionTypes.USE_SLAYER, payload: { slayerId, targetId } }), []),
    startNextNight: useCallback(() =>
      dispatch({ type: ActionTypes.START_NEXT_NIGHT }), []),
    stSetRole: useCallback((playerId, roleId) =>
      dispatch({ type: ActionTypes.ST_SET_ROLE, payload: { playerId, roleId } }), []),
    stKill: useCallback((playerId) =>
      dispatch({ type: ActionTypes.ST_KILL, payload: { playerId } }), []),
    stRevive: useCallback((playerId) =>
      dispatch({ type: ActionTypes.ST_REVIVE, payload: { playerId } }), []),
    stPoison: useCallback((playerId, poisoned) =>
      dispatch({ type: ActionTypes.ST_POISON, payload: { playerId, poisoned } }), []),
    stDrunk: useCallback((playerId, drunk) =>
      dispatch({ type: ActionTypes.ST_DRUNK, payload: { playerId, drunk } }), []),
    stReminder: useCallback((playerId, reminder) =>
      dispatch({ type: ActionTypes.ST_REMINDER, payload: { playerId, reminder } }), []),
    stDeclareWinner: useCallback((team) =>
      dispatch({ type: ActionTypes.ST_DECLARE_WINNER, payload: { team } }), []),
    loadGame: useCallback((state) =>
      dispatch({ type: ActionTypes.LOAD_GAME, payload: state }), []),
    resetGame: useCallback(() =>
      dispatch({ type: ActionTypes.RESET_GAME }), []),
    setCurrentPlayer: setCurrentPlayerId,
  };

  const value = {
    gameState,
    currentPlayerId,
    currentPlayer: gameState?.players?.find(p => p.id === currentPlayerId) || null,
    actions,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}

export default GameContext;
