# Blood on the Clocktower - Digital Edition

A complete digital implementation of Blood on the Clocktower, the social deduction game of murder and mystery for 5-20 players.

## Features

### All Three Official Scripts
- **Trouble Brewing** - The introductory script with 22 characters. Simple, clear abilities perfect for new players.
- **Sects & Violets** - Intermediate script with 26 characters. Madness, manipulation, and mind games.
- **Bad Moon Rising** - Advanced script with 26 characters. Death lurks everywhere, but so do ways to cheat it.

### Complete Role Implementations
- **50+ unique characters** across Townsfolk, Outsiders, Minions, and Demons
- **14 Traveller roles** for players joining mid-game
- **12 Fabled characters** for the Storyteller to balance gameplay
- Full night ability resolution with proper ordering
- Poison, drunk, and protection mechanics
- Special interactions (Scarlet Woman takeover, Imp starpass, Fang Gu outsider jump, etc.)

### Game Modes
- **Automated Storyteller** - The app manages night phases, information, and ability resolution automatically
- **Manual Storyteller Mode** - Full Grimoire access for a human Storyteller to run the game
- **Pass-and-Play** - Single device gameplay for in-person groups

### Full Game Flow
- Day/Night cycle management
- Nomination and voting system with proper majority rules
- Ghost votes for dead players
- Butler voting restrictions
- Execution resolution with all special cases (Saint, Virgin, Pacifist, Devil's Advocate)
- Win condition checking (Good/Evil victory, Mayor win, Vortox no-execution, etc.)

### Storyteller Tools (Grimoire)
- View all player roles and statuses
- Toggle poison/drunk status on any player
- Kill or revive players
- Add reminders to players
- Declare game winner manually
- View complete game log

### Script Browser
- Browse all characters from all three scripts
- View detailed ability descriptions
- See setup effects and night order information

## Tech Stack

- **React Native** with Expo
- **React Navigation** v6 for screen navigation
- **React Context** for game state management
- **Firebase** ready for online multiplayer

## Getting Started

```bash
cd mobileApp
npm install
npx expo start
```

## How to Play

Blood on the Clocktower is a game of social deduction:

1. **Setup**: Players sit in a circle and are secretly assigned characters
2. **Night**: Players with night abilities wake up to use their powers. The Demon kills.
3. **Day**: Deaths are announced. Players discuss, nominate, and vote to execute suspects.
4. **Win**: Good wins by executing the Demon. Evil wins when only 2 players remain.

See the in-app "How to Play" guide for detailed rules and strategy tips.
