import express from 'express';
import bShipRouter from "./routes/bShipRoute";
import {constants} from "./util/constants";

const port = constants.API_PORT;

const app = express();

app.use(express.json());

app.use('/game', bShipRouter);

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
