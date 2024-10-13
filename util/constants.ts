export const constants = {
    API_PORT: 3000,

    GRID_SIZE: 10,
    GRID_VALIDATE_REGEX: /^[A-J](10|[1-9])$/,
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
}
