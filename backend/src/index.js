//src/index.js
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { connectDB } from './config/db.js';
import publicationsRouter from './routes/publications.js';
import grantsRouter from './routes/grants.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/publications', publicationsRouter);
app.use('/api/grants', grantsRouter);

const PORT = process.env.PORT || 4000;
(async ()=> {
  await connectDB();
  app.listen(PORT, ()=> console.log(`API listening on ${PORT}`));
})();
