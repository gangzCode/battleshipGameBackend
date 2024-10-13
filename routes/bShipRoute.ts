import {Router} from 'express';
import bShipController = require('../controllers/bShipController');

const bShipRouter = Router();

bShipRouter.get('/initializeGame', bShipController.initializeGame);
bShipRouter.post('/placeShip', bShipController.placeShip);
bShipRouter.post('/removeShip', bShipController.removeShip);
bShipRouter.get('/startGame/:gameId', bShipController.startGame);
bShipRouter.post('/userAttack', bShipController.userAttack);
bShipRouter.post('/computerAttack', bShipController.computerAttack);

bShipRouter.get('/getUserBoard/:gameId', bShipController.getUserBoard);
bShipRouter.get('/getComputerBoard/:gameId', bShipController.getComputerBoard);
bShipRouter.get('/getBoardsAsHTML/:gameId', bShipController.getBoardsAsHTML);

export default bShipRouter;