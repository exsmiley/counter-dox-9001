// Firebase service for multiplayer Blood on the Clocktower
// Manages game rooms, player sync, and real-time game state

const GAMES_REF = 'botc_games';

class FirebaseService {
  constructor() {
    this.db = null;
    this.gameRef = null;
    this.listeners = [];
  }

  // Initialize with Firebase database reference
  init(firebaseDb) {
    this.db = firebaseDb;
  }

  // Generate a short game code (6 chars)
  generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Create a new game room
  async createGameRoom(hostName) {
    if (!this.db) return null;

    const gameCode = this.generateGameCode();
    const gameRef = this.db.ref(`${GAMES_REF}/${gameCode}`);

    const gameRoom = {
      code: gameCode,
      hostName,
      status: 'lobby', // lobby, playing, finished
      scriptId: null,
      players: {
        [this._sanitize(hostName)]: {
          name: hostName,
          isHost: true,
          isStoryteller: true,
          ready: false,
          joinedAt: Date.now(),
        },
      },
      gameState: null,
      createdAt: Date.now(),
    };

    await gameRef.set(gameRoom);
    this.gameRef = gameRef;
    return gameRoom;
  }

  // Join an existing game room
  async joinGameRoom(gameCode, playerName) {
    if (!this.db) return null;

    const gameRef = this.db.ref(`${GAMES_REF}/${gameCode.toUpperCase()}`);
    const snapshot = await gameRef.once('value');
    const room = snapshot.val();

    if (!room) throw new Error('Game not found');
    if (room.status !== 'lobby') throw new Error('Game already in progress');

    const playerKey = this._sanitize(playerName);
    if (room.players && room.players[playerKey]) {
      throw new Error('Name already taken');
    }

    await gameRef.child(`players/${playerKey}`).set({
      name: playerName,
      isHost: false,
      isStoryteller: false,
      ready: false,
      joinedAt: Date.now(),
    });

    this.gameRef = gameRef;
    return { ...room, code: gameCode.toUpperCase() };
  }

  // Listen for game room changes
  onGameRoomChange(gameCode, callback) {
    if (!this.db) return;

    const gameRef = this.db.ref(`${GAMES_REF}/${gameCode}`);
    const listener = gameRef.on('value', (snapshot) => {
      callback(snapshot.val());
    });

    this.listeners.push({ ref: gameRef, event: 'value', callback: listener });
    return () => gameRef.off('value', listener);
  }

  // Update game state in Firebase
  async updateGameState(gameCode, gameState) {
    if (!this.db) return;
    await this.db.ref(`${GAMES_REF}/${gameCode}/gameState`).set(gameState);
  }

  // Set script for the game
  async setScript(gameCode, scriptId) {
    if (!this.db) return;
    await this.db.ref(`${GAMES_REF}/${gameCode}/scriptId`).set(scriptId);
  }

  // Start the game
  async startGame(gameCode) {
    if (!this.db) return;
    await this.db.ref(`${GAMES_REF}/${gameCode}/status`).set('playing');
  }

  // Submit a night action
  async submitNightAction(gameCode, playerName, action) {
    if (!this.db) return;
    await this.db.ref(`${GAMES_REF}/${gameCode}/nightActions/${this._sanitize(playerName)}`).set({
      ...action,
      submittedAt: Date.now(),
    });
  }

  // Submit a vote
  async submitVote(gameCode, playerName, vote) {
    if (!this.db) return;
    await this.db.ref(`${GAMES_REF}/${gameCode}/votes/${this._sanitize(playerName)}`).set({
      vote,
      submittedAt: Date.now(),
    });
  }

  // Leave a game room
  async leaveGameRoom(gameCode, playerName) {
    if (!this.db) return;
    await this.db.ref(`${GAMES_REF}/${gameCode}/players/${this._sanitize(playerName)}`).remove();
  }

  // Delete a game room
  async deleteGameRoom(gameCode) {
    if (!this.db) return;
    await this.db.ref(`${GAMES_REF}/${gameCode}`).remove();
  }

  // Set player ready status
  async setPlayerReady(gameCode, playerName, ready) {
    if (!this.db) return;
    await this.db.ref(`${GAMES_REF}/${gameCode}/players/${this._sanitize(playerName)}/ready`).set(ready);
  }

  // Clean up listeners
  cleanup() {
    for (const { ref, event, callback } of this.listeners) {
      ref.off(event, callback);
    }
    this.listeners = [];
    this.gameRef = null;
  }

  _sanitize(str) {
    return str.replace(/[.#$[\]]/g, '_');
  }
}

export default new FirebaseService();
