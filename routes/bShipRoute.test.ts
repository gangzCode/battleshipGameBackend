import express from 'express';
import request from 'supertest';
import bShipRouter from './bShipRoute';
import sqlite3 from "sqlite3";

describe('Express App', () => {
    const app = express();
    app.use(express.json());

    app.use('/', bShipRouter);

    let gameID: string;

    // Game ID is necessary for all tests. Hence, individual tests will not result in success.
    it('should initialize a game', async () => {
        const response = await request(app).get('/initializeGame');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        gameID = response.body.data;
        console.log(`Game ID: ${gameID}`);
    });

    it('should reject these positions', async () => {
        // Get database connection
        const db = getDBConnection();
        // Get all rows from test_ship_position table where is_valid='N'. Data is loaded as a promise and resolved.
        const rows = await new Promise<any[]>((resolve, reject) => {
            db.all(`SELECT * FROM test_ship_position WHERE is_valid='N'`, (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
        // For each row, send a POST request to /placeShip with shipStartPos and shipEndPos.
        for (const row of rows) {
            const response = await request(app)
                .post('/placeShip')
                .send({
                    gameId: gameID,
                    shipStartPos: row.ship_pos_start,
                    shipEndPos: row.ship_pos_end
                });
            // Expect the response status to be 400 and the response body to have a property 'message'.
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
        }
        // Close database connection
        closeDBConnection(db);
    });

    it('should accept these positions', async () => {
        const db = getDBConnection();
        const rows = await new Promise<any[]>((resolve, reject) => {
            db.all(`SELECT * FROM test_ship_position WHERE is_valid='Y'`, (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
        for (const row of rows) {
            const response = await request(app)
                .post('/placeShip')
                .send({
                    gameId: gameID,
                    shipStartPos: row.ship_pos_start,
                    shipEndPos: row.ship_pos_end
                });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
        }
        closeDBConnection(db);
    });

    it('should start the game', async () => {
        const response = await request(app).get(`/startGame/${gameID}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
    });

    it('should return the user board', async () => {
        const response = await request(app).get(`/getUserBoard/${gameID}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
    });

    it('should return the computer board', async () => {
        const response = await request(app).get(`/getComputerBoard/${gameID}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
    });

    it('should reject these attacks', async () => {
        const db = getDBConnection();
        const rows = await new Promise<any[]>((resolve, reject) => {
            db.all(`SELECT * FROM test_attack_position WHERE is_valid='N'`, (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
        for (const row of rows) {
            const response = await request(app)
                .post('/userAttack')
                .send({
                    gameId: gameID,
                    attackPos: row.attack_pos
                });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('message');
        }
        closeDBConnection(db);
    });

    it('should accept these attacks and play computer move', async () => {
        const db = getDBConnection();
        const rows = await new Promise<any[]>((resolve, reject) => {
            db.all(`SELECT * FROM test_attack_position WHERE is_valid='Y'`, (error, rows) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(rows);
                }
            });
        });
        for (const row of rows) {
            const response = await request(app)
                .post('/userAttack')
                .send({
                    gameId: gameID,
                    attackPos: row.attack_pos
                });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');

            // Computer attack must be played after user attack
            const response2 = await request(app)
                .post('/computerAttack')
                .send({
                    gameId: gameID
                });
            expect(response2.status).toBe(200);
            expect(response2.body).toHaveProperty('message');
        }
        closeDBConnection(db);
    });

});

function getDBConnection() {
    return new sqlite3.Database("./database/test-database.sqlite", (error) => {
        if (error) {
            console.error("Error opening database:", error.message);
        } else {
            console.log("Connected to the SQLite database.");
        }
    });
}

function closeDBConnection(db: sqlite3.Database) {
    db.close((error) => async () => {
        if (error) {
            console.error("Error closing the database:", error.message);
        } else {
            console.log("Database connection closed.");
        }
    });
}