export default class Game {

    gameStatus: string = "PENDING";

    bShipCount: number = 0;
    dShipCount: number = 0;

    userTurnCount: number = 0;
    computerTurnCount: number = 0;

    computerPreviousAttacks: string[] = [];
    computerPreviousValidAttacks: string[] = [];
    computerPreviousInvalidAttacks: string[] = [];

    // 10x10 grid
    userBoard: string[][] = [];
    computerBoard: string[][] = [];

    userFloatingShipCells: string[][] = [];
    userDestroyedShipCells: string[][] = [];

    computerFloatingShipCells: string[][] = [];
    computerDestroyedShipCells: string[][] = [];

}
