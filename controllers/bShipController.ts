import {Request, Response} from "express";
import Game from '../models/game';
import {constants} from "../util/constants";

const runningGames: Map<String, Game> = new Map();

// Create a new game instance
export const initializeGame = (_req: Request, res: Response) => {
    try {
        let game = new Game();
        // Generate a random gameId. Recommended to use UUIDs, but for ease of use using a random string
        const gameId = Math.random().toString(36).substring(2, 7);
        for (let i = 0; i < constants.GRID_SIZE; i++) {
            game.userBoard.push([]);
            game.computerBoard.push([]);
            for (let j = 0; j < constants.GRID_SIZE; j++) {
                game.userBoard[i].push(constants.EMPTY_CELL);
                game.computerBoard[i].push(constants.EMPTY_CELL);
            }
        }
        // Initialize the game with the generated gameId and saved in memory
        runningGames.set(gameId, game);
        // Game id is returned to the user. This can be used to make further requests to this specific game instance
        res.status(200).send({
            data: gameId,
            message: "Game Initialized Successfully."
        });
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Place ship on the user board. Works only if the game is in PENDING state
export const placeShip = (req: Request, res: Response) => {
    try {
        const gameId = req.body.gameId;
        const game = runningGames.get(gameId);
        if (game) {
            if (game.gameStatus !== constants.GAME_PENDING) {
                res.status(400).send({
                    message: "Game Already Started."
                });
                return;
            }
            // Ship start position in string format B5
            let shipStartPos = req.body.shipStartPos;
            if (shipStartPos) {
                shipStartPos = shipStartPos.toUpperCase().trim();
            }
            let shipEndPos = req.body.shipEndPos;
            if (shipEndPos) {
                shipEndPos = shipEndPos.toUpperCase().trim();
            }
            // Filter out invalid positions using a regex
            const validRangeRegex = constants.GRID_VALIDATE_REGEX;
            if (!validRangeRegex.test(shipStartPos) || !validRangeRegex.test(shipEndPos)) {
                res.status(400).send({
                    message: "Invalid Ship Position."
                });
                return;
            }
            // Calculate the start and end positions of the ship in the grid (2D array)
            let shipXStartIndex = getIndexForAlpha(shipStartPos.charAt(0));
            let shipYStartIndex = parseInt(shipStartPos.slice(1)) - 1;
            let shipXEndIndex = getIndexForAlpha(shipEndPos.charAt(0));
            let shipYEndIndex = parseInt(shipEndPos.slice(1)) - 1;
            let shipSize = 0;
            // Check if the ship is placed horizontally or vertically
            if (shipXStartIndex === shipXEndIndex) {
                shipSize = Math.abs(shipYEndIndex - shipYStartIndex) + 1;
            } else if (shipYStartIndex === shipYEndIndex) {
                shipSize = Math.abs(shipXEndIndex - shipXStartIndex) + 1;
            } else {
                res.status(400).send({
                    message: "Invalid Ship Position. Ships should be aligned either horizontally or vertically."
                });
                return;
            }
            // Check if the ship size is valid and if the maximum number of ships are placed
            if (shipSize !== constants.SHIP_SIZE_D && shipSize !== constants.SHIP_SIZE_B) {
                res.status(400).send({
                    message: "Invalid Ship Size."
                });
                return;
            }
            if (shipSize === constants.SHIP_SIZE_D && game.dShipCount === constants.MAX_D_SHIP_COUNT) {
                res.status(400).send({
                    message: "Maximum Destroyer Ships Placed."
                });
                return;
            } else if (shipSize === constants.SHIP_SIZE_B && game.bShipCount === constants.MAX_B_SHIP_COUNT) {
                res.status(400).send({
                    message: "Maximum Battleship Placed."
                });
                return;
            }
            // Check if the ship overlaps with any other ship
            let overlappedPos = []
            for (let i = shipXStartIndex; i <= shipXEndIndex; i++) {
                for (let j = shipYStartIndex; j <= shipYEndIndex; j++) {
                    if (game.userBoard[i][j] !== constants.EMPTY_CELL) {
                        overlappedPos.push(getAlphaForIndex(i) + (j + 1));
                    }
                }
            }
            if (overlappedPos.length > 0) {
                res.status(400).send({
                    message: "Ship Overlaps at position: " + overlappedPos
                });
                return;
            } else {
                let shipCoordinates = [];
                for (let i = shipXStartIndex; i <= shipXEndIndex; i++) {
                    for (let j = shipYStartIndex; j <= shipYEndIndex; j++) {
                        game.userBoard[i][j] = constants.SHIP_CELL;
                        shipCoordinates.push(getAlphaForIndex(i) + (j + 1));
                    }
                }
                game.userFloatingShipCells.push(shipCoordinates);
                if (shipSize === constants.SHIP_SIZE_B) {
                    game.bShipCount++;
                } else {
                    game.dShipCount++;
                }
                // Check if all ships are placed and change the game status to READY
                if (game.bShipCount === constants.MAX_B_SHIP_COUNT && game.dShipCount === constants.MAX_D_SHIP_COUNT) {
                    game.gameStatus = constants.GAME_READY;
                    res.status(200).send({
                        message: "All Ships Placed Successfully. Ready to Start."
                    });
                } else {
                    res.status(200).send({
                        message: "Ship Placed Successfully."
                    });
                }
            }
        } else {
            res.status(404).send({
                message: "Game Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Remove a ship from the user board. Works only if the game is in PENDING or READY state.
// If the state is READY, the game is reset to PENDING state
export const removeShip = (req: Request, res: Response) => {
    try {
        const gameId = req.body.gameId;
        const game = runningGames.get(gameId);
        if (game) {
            if (game.gameStatus !== constants.GAME_PENDING && game.gameStatus !== constants.GAME_READY) {
                res.status(400).send({
                    message: "Game Already Started."
                });
                return;
            }
            let shipStartPos = req.body.shipStartPos;
            if (shipStartPos) {
                shipStartPos = shipStartPos.toUpperCase().trim();
            }
            let shipEndPos = req.body.shipEndPos;
            if (shipEndPos) {
                shipEndPos = shipEndPos.toUpperCase().trim();
            }
            for (let i = 0; i < game.userFloatingShipCells.length; i++) {
                if (game.userFloatingShipCells[i].includes(shipStartPos) && game.userFloatingShipCells[i].includes(shipEndPos)) {
                    for (let j = 0; j < game.userFloatingShipCells[i].length; j++) {
                        let shipPos = game.userFloatingShipCells[i][j];
                        let shipXIndex = getIndexForAlpha(shipPos.charAt(0));
                        let shipYIndex = parseInt(shipPos.slice(1)) - 1;
                        game.userBoard[shipXIndex][shipYIndex] = constants.EMPTY_CELL;
                    }
                    let shipSize = game.userFloatingShipCells[i].length;
                    game.userFloatingShipCells.splice(i, 1);
                    if (shipSize === constants.SHIP_SIZE_B) {
                        game.bShipCount--;
                    } else {
                        game.dShipCount--;
                    }
                    game.gameStatus = constants.GAME_PENDING
                    res.status(200).send({
                        message: "Ship Removed Successfully."
                    });
                    return;
                }
            }
            res.status(400).send({
                message: "Ship Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Randomly place ships on the computer board and start the game. Works only if the game is in READY state
export const startGame = (req: Request, res: Response) => {
    try {
        const gameId = req.params.gameId;
        let game = runningGames.get(gameId);
        if (game) {
            if (game.gameStatus !== constants.GAME_READY) {
                res.status(400).send({
                    message: "Game Not Ready."
                });
                return;
            }
            // Dynamically place ships on the computer board randomly
            for (let i = 0; i < constants.MAX_B_SHIP_COUNT; i++) {
                randomlyPlaceShip(constants.SHIP_SIZE_B, game);
            }
            for (let i = 0; i < constants.MAX_D_SHIP_COUNT; i++) {
                randomlyPlaceShip(constants.SHIP_SIZE_D, game);
            }
            game.gameStatus = constants.GAME_USER_TURN;
            res.status(200).send({
                message: "Game Started. User's Turn."
            });
        } else {
            res.status(404).send({
                message: "Game Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Get the current status of the user's and computer's ship count
export const getShipStatus = (req: Request, res: Response) => {
    try {
        const gameId = req.params.gameId;
        const game = runningGames.get(gameId);
        if (game) {
            if (game.computerShipStatus.length === 0) {
                for (let i = 0; i < game.computerFloatingShipCells.length; i++) {
                    let shipStatus = game.computerFloatingShipCells[i].length.toString();
                    shipStatus = ("0/" + shipStatus);
                    game.computerShipStatus.push(shipStatus);
                }
            }
            if (game.userShipStatus.length === 0) {
                for (let i = 0; i < game.userFloatingShipCells.length; i++) {
                    let shipStatus = game.userFloatingShipCells[i].length.toString();
                    shipStatus = ("0/" + shipStatus);
                    game.userShipStatus.push(shipStatus);
                }
            }
            res.status(200).send({
                bShipCount: game.bShipCount,
                dShipCount: game.dShipCount,
                userShipStatus: game.userShipStatus,
                computerShipStatus: game.computerShipStatus
            });
        } else {
            res.status(404).send({
                message: "Game Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Get the current status of the user's board
export const getUserBoard = (req: Request, res: Response) => {
    try {
        const gameId = req.params.gameId;
        const game = runningGames.get(gameId);
        if (game) {
            res.status(200).send({
                data: game.userBoard
            });
        } else {
            res.status(404).send({
                message: "Game Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Get the current status of the computer's board. Ships are hidden
export const getComputerBoard = (req: Request, res: Response) => {
    try {
        const gameId = req.params.gameId;
        const game = runningGames.get(gameId);
        if (game) {
            for (let i = 0; i < game.computerBoard.length; i++) {
                for (let j = 0; j < game.computerBoard[i].length; j++) {
                    if (game.computerBoard[i][j] === constants.SHIP_CELL) {
                        game.computerBoard[i][j] = constants.EMPTY_CELL;
                    }
                }
            }
            res.status(200).send({
                data: game.computerBoard
            });
        } else {
            res.status(404).send({
                message: "Game Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Get the current status of the user's and computer's board as HTML.
// THIS IS FOR DEMONSTRATION PURPOSES ONLY. Computer Ships are also Visible
export const getBoardsAsHTML = (req: Request, res: Response) => {
    try {
        const gameId = req.params.gameId;
        const game = runningGames.get(gameId);
        if (game) {
            let html = "<div style='display: flex; width: 100%;'>";
            html += "<div style='flex-grow: 1'><h1>User Board</h1>";
            html += "<table>";
            for (let i = 0; i < game.userBoard.length; i++) {
                html += "<tr>";
                for (let j = 0; j < game.userBoard[i].length; j++) {
                    html += "<td style='width: 30px; height: 30px; border: 1px solid black; text-align: center;'>" + game.userBoard[i][j] + "</td>";
                }
                html += "</tr>";
            }
            html += "</table>";
            html += "</div>";
            html += "<div style='flex-grow: 1'>";
            html += "<h1>Computer Board</h1>";
            html += "<table>";
            // Computer ships are also visible for demonstration purposes
            for (let i = 0; i < game.computerBoard.length; i++) {
                html += "<tr>";
                for (let j = 0; j < game.computerBoard[i].length; j++) {
                    html += "<td style='width: 30px; height: 30px; border: 1px solid black; text-align: center;'>" + game.computerBoard[i][j] + "</td>";
                }
                html += "</tr>";
            }
            html += "</table>";
            html += "</div></div>";
            res.status(200).send(html);
        } else {
            res.status(404).send({
                message: "Game Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Deploy the user's attack on the computer's board. Works only if the game is in USER_TURN state
// After the attack, the game state changes to COMPUTER_TURN. Also check if the user has won
export const userAttack = (req: Request, res: Response) => {
    try {
        const gameId = req.body.gameId;
        let attackPos = req.body.attackPos;
        if (attackPos) {
            attackPos = attackPos.toUpperCase().trim();
        }
        const game = runningGames.get(gameId);
        if (game) {
            if (game.gameStatus !== constants.GAME_USER_TURN) {
                res.status(400).send({
                    message: "Not User's Turn."
                });
                return;
            }
            const validRangeRegex = constants.GRID_VALIDATE_REGEX;
            if (!validRangeRegex.test(attackPos)) {
                res.status(400).send({
                    message: "Invalid Attack Position."
                });
                return;
            }
            let attackXIndex = getIndexForAlpha(attackPos.charAt(0));
            let attackYIndex = parseInt(attackPos.slice(1)) - 1;
            if (game.computerBoard[attackXIndex][attackYIndex] === constants.SHIP_CELL) {
                game.computerBoard[attackXIndex][attackYIndex] = constants.HIT_CELL;
                for (let i = 0; i < game.computerFloatingShipCells.length; i++) {
                    // Check if the entire ship is destroyed
                    let allCellsHit = true;
                    // Gather ship status for the computer
                    let shipStatusList = [];
                    for (let x = 0; x < game.computerFloatingShipCells.length; x++) {
                        let shipStatus = game.computerFloatingShipCells[x].length.toString();
                        let hitCount = 0;
                        for (let y = 0; y < game.computerFloatingShipCells[x].length; y++) {
                            let shipPos = game.computerFloatingShipCells[x][y];
                            if (x==i && game.computerBoard[getIndexForAlpha(shipPos.charAt(0))][parseInt(shipPos.slice(1)) - 1] === constants.SHIP_CELL) {
                                allCellsHit = false;
                            }
                            if (game.computerBoard[getIndexForAlpha(shipPos.charAt(0))][parseInt(shipPos.slice(1)) - 1] === constants.HIT_CELL) {
                                hitCount++;
                            }
                        }
                        shipStatus = (hitCount + "/" + shipStatus);
                        shipStatusList.push(shipStatus);
                    }
                    for (let x = 0; x < game?.computerDestroyedShipCells.length; x++) {
                        let shipStatus = game.computerDestroyedShipCells[x].length.toString();
                        shipStatus = (shipStatus + "/" + shipStatus);
                        shipStatusList.push(shipStatus);
                    }
                    game.computerShipStatus = shipStatusList;
                    if (allCellsHit) {
                        // Remove the destroyed ship from the floating ships and added to destroyed ships
                        game.computerDestroyedShipCells.push(game.computerFloatingShipCells[i]);
                        game.computerFloatingShipCells.splice(i, 1);
                        game.userTurnCount++;
                        // if there are no more floating ships, user wins
                        if (game.computerFloatingShipCells.length === 0) {
                            game.gameStatus = constants.GAME_OVER;
                            res.status(200).send({
                                status: "USER_WIN",
                                message: "User Hit Computer Ship. All Ships Destroyed. User Wins.",
                                userTurnCount: game.userTurnCount,
                                computerTurnCount: game.computerTurnCount
                            });
                            return;
                        } else {
                            game.gameStatus = constants.GAME_COMPUTER_TURN;
                            res.status(200).send({
                                status: "USER_SHIP_DESTROYED",
                                message: "User Hit Computer Ship. Ship Destroyed.",
                                userTurnCount: game.userTurnCount,
                                computerTurnCount: game.computerTurnCount
                            });
                            return;
                        }
                    }
                }
                game.userTurnCount++;
                game.gameStatus = constants.GAME_COMPUTER_TURN;
                res.status(200).send({
                    status: "USER_HIT",
                    message: "User Hit Computer Ship.",
                    userTurnCount: game.userTurnCount,
                    computerTurnCount: game.computerTurnCount
                });
            } else if (
                game.computerBoard[attackXIndex][attackYIndex] === constants.HIT_CELL ||
                game.computerBoard[attackXIndex][attackYIndex] === constants.MISS_CELL
            ) {
                res.status(400).send({
                    message: "Already Attacked Position."
                });
            } else {
                game.computerBoard[attackXIndex][attackYIndex] = constants.MISS_CELL;
                game.userTurnCount++;
                game.gameStatus = constants.GAME_COMPUTER_TURN;
                res.status(200).send({
                    status: "USER_MISS",
                    message: "User Missed.",
                    userTurnCount: game.userTurnCount,
                    computerTurnCount: game.computerTurnCount
                });
            }
        } else {
            res.status(404).send({
                message: "Game Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Deploy the computer's attack on the user's board. Works only if the game is in COMPUTER_TURN state.
// After the attack, the game state changes to USER_TURN. Also check if the computer has won
export const computerAttack = (req: Request, res: Response) => {
    try {
        const gameId = req.body.gameId;
        const game = runningGames.get(gameId);
        if (game) {
            if (game.gameStatus !== constants.GAME_COMPUTER_TURN) {
                res.status(400).send({
                    message: "Not Computer's Turn."
                });
                return;
            }
            let attackXIndex;
            let attackYIndex;
            // Check if one of previous attacks was a success to follow-up.
            if (game.computerPreviousValidAttacks.length == 0) {
                // Random attack
                while (true) {
                    attackXIndex = Math.floor(Math.random() * constants.GRID_SIZE);
                    attackYIndex = Math.floor(Math.random() * constants.GRID_SIZE);
                    let attackPos = getAlphaForIndex(attackXIndex) + (attackYIndex + 1);
                    if (!game.computerPreviousAttacks.includes(attackPos)) {
                        break;
                    }
                }
            } else {
                // Follow-up attack
                let viableAttackPositions: string[] = [];
                if (game.computerPreviousValidAttacks.length > 1) {
                    // if more than one success previous attack, check if horizontal or vertical to follow-up
                    let isHorizontal = game.computerPreviousValidAttacks[0].charAt(0) === game.computerPreviousValidAttacks[1].charAt(0);
                    if (isHorizontal) {
                        for (let i = 0; i < game.computerPreviousValidAttacks.length; i++) {
                            if (parseInt(game.computerPreviousValidAttacks[i].charAt(1)) < constants.GRID_SIZE) {
                                const incrementedCell = incrementAlphaCellHorizontally(game.computerPreviousValidAttacks[i]);
                                if (!viableAttackPositions.includes(incrementedCell)) {
                                    viableAttackPositions.push(incrementedCell);
                                }
                            }
                            if (parseInt(game.computerPreviousValidAttacks[i].charAt(1)) > 1) {
                                const decrementedCell = decrementAlphaCellHorizontally(game.computerPreviousValidAttacks[i]);
                                if (!viableAttackPositions.includes(decrementedCell)) {
                                    viableAttackPositions.push(decrementedCell);
                                }
                            }
                        }
                    } else {
                        for (let i = 0; i < game.computerPreviousValidAttacks.length; i++) {
                            if (getIndexForAlpha(game.computerPreviousValidAttacks[i].charAt(0)) < constants.GRID_SIZE) {
                                const incrementedCell = incrementAlphaCellVertically(game.computerPreviousValidAttacks[i]);
                                if (!viableAttackPositions.includes(incrementedCell)) {
                                    viableAttackPositions.push(incrementedCell);
                                }
                            }
                            if (getIndexForAlpha(game.computerPreviousValidAttacks[i].charAt(0)) > 0) {
                                const decrementedCell = decrementAlphaCellVertically(game.computerPreviousValidAttacks[i]);
                                if (!viableAttackPositions.includes(decrementedCell)) {
                                    viableAttackPositions.push(decrementedCell);
                                }
                            }
                        }
                    }
                } else {
                    // if only one previous attack, check all directions
                    viableAttackPositions.push(incrementAlphaCellHorizontally(game.computerPreviousValidAttacks[0]));
                    viableAttackPositions.push(decrementAlphaCellHorizontally(game.computerPreviousValidAttacks[0]));
                    viableAttackPositions.push(incrementAlphaCellVertically(game.computerPreviousValidAttacks[0]));
                    viableAttackPositions.push(decrementAlphaCellVertically(game.computerPreviousValidAttacks[0]));
                }
                // Remove invalid / previously attacked positions
                for (let i = 0; i < viableAttackPositions.length; i++) {
                    if (game.computerPreviousInvalidAttacks.includes(viableAttackPositions[i])) {
                        viableAttackPositions.splice(i, 1);
                        i--;
                    } else if (game.computerPreviousValidAttacks.includes(viableAttackPositions[i])) {
                        viableAttackPositions.splice(i, 1);
                        i--;
                    } else if (game.computerPreviousAttacks.includes(viableAttackPositions[i])) {
                        viableAttackPositions.splice(i, 1);
                        i--;
                    }
                }
                let randomIndex = Math.floor(Math.random() * viableAttackPositions.length);
                let attackPos = viableAttackPositions[randomIndex];
                attackXIndex = getIndexForAlpha(attackPos.charAt(0));
                attackYIndex = parseInt(attackPos.slice(1)) - 1;
            }
            // Deploy the attack for random or follow-up
            if (game.userBoard[attackXIndex][attackYIndex] === constants.SHIP_CELL) {
                // Store the attack position to filter next attacks
                game.computerPreviousAttacks.push(getAlphaForIndex(attackXIndex) + (attackYIndex + 1));
                game.userBoard[attackXIndex][attackYIndex] = constants.HIT_CELL;
                for (let i = 0; i < game.userFloatingShipCells.length; i++) {
                    // Check if the entire ship is destroyed
                    let allCellsHit = true;
                    // Gather ship status for the user
                    let shipStatusList = [];
                    for (let x = 0; x < game.userFloatingShipCells.length; x++) {
                        let shipStatus = game.userFloatingShipCells[x].length.toString();
                        let hitCount = 0;
                        for (let y = 0; y < game.userFloatingShipCells[x].length; y++) {
                            let shipPos = game.userFloatingShipCells[x][y];
                            if (x==i && game.userBoard[getIndexForAlpha(shipPos.charAt(0))][parseInt(shipPos.slice(1)) - 1] === constants.SHIP_CELL) {
                                allCellsHit = false;
                            }
                            if (game.userBoard[getIndexForAlpha(shipPos.charAt(0))][parseInt(shipPos.slice(1)) - 1] === constants.HIT_CELL) {
                                hitCount++;
                            }
                        }
                        shipStatus = (hitCount + "/" + shipStatus);
                        shipStatusList.push(shipStatus);
                    }
                    for (let x = 0; x < game?.userDestroyedShipCells.length; x++) {
                        let shipStatus = game.userDestroyedShipCells[x].length.toString();
                        shipStatus = (shipStatus + "/" + shipStatus);
                        shipStatusList.push(shipStatus);
                    }
                    game.userShipStatus = shipStatusList;
                    if (allCellsHit) {
                        game.userDestroyedShipCells.push(game.userFloatingShipCells[i]);
                        game.userFloatingShipCells.splice(i, 1);
                        game.computerTurnCount++;
                        // Clear previous attacks if ship is destroyed. Follow-up attacks are completed
                        game.computerPreviousValidAttacks = [];
                        game.computerPreviousInvalidAttacks = [];
                        if (game.userFloatingShipCells.length === 0) {
                            game.gameStatus = constants.GAME_OVER;
                            res.status(200).send({
                                status: "COMPUTER_WIN",
                                message: "Computer Hit User Ship. All Ships Destroyed. Computer Wins.",
                                userTurnCount: game.userTurnCount,
                                computerTurnCount: game.computerTurnCount
                            });
                            return;
                        } else {
                            game.gameStatus = constants.GAME_USER_TURN;
                            res.status(200).send({
                                status: "COMPUTER_SHIP_DESTROYED",
                                message: "Computer Hit User Ship. Ship Destroyed.",
                                userTurnCount: game.userTurnCount,
                                computerTurnCount: game.computerTurnCount
                            });
                            return;
                        }
                    }
                }
                game.computerTurnCount++;
                game.gameStatus = constants.GAME_USER_TURN;
                // Store the successful attack to follow-up
                game.computerPreviousValidAttacks.push(getAlphaForIndex(attackXIndex) + (attackYIndex + 1));
                res.status(200).send({
                    status: "COMPUTER_HIT",
                    message: "Computer Hit User Ship.",
                    userTurnCount: game.userTurnCount,
                    computerTurnCount: game.computerTurnCount
                });
            } else {
                game.computerPreviousAttacks.push(getAlphaForIndex(attackXIndex) + (attackYIndex + 1));
                game.userBoard[attackXIndex][attackYIndex] = constants.MISS_CELL;
                game.computerTurnCount++;
                game.gameStatus = constants.GAME_USER_TURN;
                // Store the unsuccessful attack to filter next follow-up attacks
                if (game.computerPreviousValidAttacks.length > 0) {
                    game.computerPreviousInvalidAttacks.push(getAlphaForIndex(attackXIndex) + (attackYIndex + 1));
                }
                res.status(200).send({
                    status: "COMPUTER_MISS",
                    message: "Computer Missed.",
                    userTurnCount: game.userTurnCount,
                    computerTurnCount: game.computerTurnCount
                });
            }
        } else {
            res.status(404).send({
                message: "Game Not Found."
            });
        }
    } catch (e) {
        console.error(e);
        res.status(500).send({
            message: "Internal Server Error Occurred."
        });
    }
}

// Get index for the alphabet character. A → 0, B → 1
function getIndexForAlpha(character: string) {
    character = character.toUpperCase().trim();
    return character.charCodeAt(0) - 65;
}

// Get alphabet character for the index. 0 → A, 1 → B
function getAlphaForIndex(index: number) {
    return String.fromCharCode(index + 65);
}

// Randomly place ships on the computer board
function randomlyPlaceShip(shipSize: number, game: Game) {
    let shipCoordinates = [];
    let shipXStartIndex = Math.floor(Math.random() * constants.GRID_SIZE);
    let shipYStartIndex = Math.floor(Math.random() * constants.GRID_SIZE);
    let isHorizontal = Math.random() >= 0.5;
    if (isHorizontal) {
        if ((shipYStartIndex + shipSize) > constants.GRID_SIZE) {
            shipYStartIndex = constants.GRID_SIZE - shipSize;
        }
        for (let i = shipYStartIndex; i < (shipYStartIndex + shipSize); i++) {
            shipCoordinates.push(getAlphaForIndex(shipXStartIndex) + (i + 1));
        }
    } else {
        if ((shipXStartIndex + shipSize) > constants.GRID_SIZE) {
            shipXStartIndex = constants.GRID_SIZE - shipSize;
        }
        for (let i = shipXStartIndex; i < (shipXStartIndex + shipSize); i++) {
            shipCoordinates.push(getAlphaForIndex(i) + (shipYStartIndex + 1));
        }
    }
    // check for overlap
    for (let i = 0; i < shipCoordinates.length; i++) {
        let shipXIndex = getIndexForAlpha(shipCoordinates[i].charAt(0));
        let shipYIndex = parseInt(shipCoordinates[i].slice(1)) - 1;
        if (game.computerBoard[shipXIndex][shipYIndex] === constants.SHIP_CELL) {
            // If overlap, try again
            randomlyPlaceShip(shipSize, game);
            return;
        }
    }
    for (let i = 0; i < shipCoordinates.length; i++) {
        let shipXIndex = getIndexForAlpha(shipCoordinates[i].charAt(0));
        let shipYIndex = parseInt(shipCoordinates[i].slice(1)) - 1;
        game.computerBoard[shipXIndex][shipYIndex] = constants.SHIP_CELL;
    }
    game.computerFloatingShipCells.push(shipCoordinates);
}

// Increment the cell horizontally. A1 → A2
function incrementAlphaCellHorizontally(cell: string) {
    let cellAlpha = cell.charAt(0);
    let cellNumber = parseInt(cell.slice(1));
    let nextCellNumber = cellNumber + 1;
    return cellAlpha + nextCellNumber;
}

// Decrement the cell horizontally. A2 → A1
function decrementAlphaCellHorizontally(cell: string) {
    let cellAlpha = cell.charAt(0);
    let cellNumber = parseInt(cell.slice(1));
    let nextCellNumber = cellNumber - 1;
    return cellAlpha + nextCellNumber;
}

// Increment the cell vertically. A1 → B1
function incrementAlphaCellVertically(cell: string) {
    let cellAlpha = cell.charAt(0);
    let cellNumber = parseInt(cell.slice(1));
    let nextCellAlpha = String.fromCharCode(cellAlpha.charCodeAt(0) + 1);
    return nextCellAlpha + cellNumber;
}

// Decrement the cell vertically. B1 → A1
function decrementAlphaCellVertically(cell: string) {
    let cellAlpha = cell.charAt(0);
    let cellNumber = parseInt(cell.slice(1));
    let nextCellAlpha = String.fromCharCode(cellAlpha.charCodeAt(0) - 1);
    return nextCellAlpha + cellNumber;
}
