# battleshipGameBackend
The node js and express js based back end application for battle ship game


# Battleship Game API

This project implements a Battleship game back-end using **Node.js** and **Express.js**, where a player can play against the computer. The game stores state and grid information in an **SQLite** database.

## Features

- Start mutiple game simultaneously.
- Player vs Computer gameplay.
- Random ship placement for computer only and manual ship placement and removal for player only.
- After intializing and placing the ships manually for player can start the game.
- After starting can't change the posistions of ships for both computer and player.
- Computer will make the first attack.
- Player can make the second attack.
- If player's ship got hit the computer will make the attacks on the adjacent boxes of the hit box to complete the destruction of that ship.
- A basic HTML frontend build can be called through {{BASE_URL}}/getBoardsAsHTML/{{GAME_CODE}} API to view the Visual representation of the boards for both computer and player with the status for each cell whether it's a hit cell, never hit cell, missed hit cell in the response preview of the postman.
- SQLite database used to store game test data.
- Track game phases (PENDING, READY, USER_TURN, COMPUTER_TURN, GAME_OVER).

## Prerequisites

- [Node.js](https://nodejs.org/) (18.20.2)
- [npm](https://www.npmjs.com/) (Node Package Manager)
- SQLite for database storage

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-folder>
```

### 2. Install the dependencies

```bash
npm install
```

### 3. Start the server

```bash
npm start
```

By default, the server will run at [http://localhost:3000](http://localhost:3000).

### 4. Run tests (if applicable)

```bash
npm test
```

## API Endpoints

Here are the available API endpoints:

| Endpoint                             | Method | Description                                |
|------------------------------------- |--------|--------------------------------------------|
| `/game/initializeGame`               | GET    | Initialize a new game                      |
| `/game/placeShip`                    | POST   | Manually place a ship on the user’s grid   |
| `/game/removeShip`                   | POST   | Remove a ship from the user’s grid         |
| `/game/startGame/:gameId`            | GET    | Start the game once ships are placed       |
| `/game/userAttack`                   | POST   | Player attacks the computer grid           |
| `/game/computerAttack`               | POST   | Computer randomly attacks user’s grid      |
| `/game/getUserBoard/:gameId`         | GET    | Retrieve the user’s board                  |
| `/game/getComputerBoard/:gameId`     | GET    | Retrieve the computer’s board              |
| `/game/getBoardsAsHTML/:gameId`      | GET    | Retrieve both boards in HTML format        |
| `/game/getShipStatus/:gameId`        | GET    | Retrieve the status of both party ships    |

## Database

This project uses **SQLite** as the database. It stores game data, including the state of the grids and game progression. No additional setup is required—SQLite will generate a database file when the application runs.

## Configuration

Configuration values such as the API port, grid size, ship details, and game status values are set in the `constants.js` file located in the `util` directory.

```js
export const constants = {
    API_PORT: 3000,
    GRID_SIZE: 10,
    SHIP_SIZE_B: 5,
    SHIP_SIZE_D: 4,
    MAX_B_SHIP_COUNT: 1,
    MAX_D_SHIP_COUNT: 2,
    EMPTY_CELL: "-",
    SHIP_CELL: "S",
    HIT_CELL: "X",
    MISS_CELL: "O",
    GAME_PENDING: "PENDING",
    GAME_READY: "READY",
    GAME_USER_TURN: "USER_TURN",
    GAME_COMPUTER_TURN: "COMPUTER_TURN",
    GAME_OVER: "GAME_OVER",
};
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

