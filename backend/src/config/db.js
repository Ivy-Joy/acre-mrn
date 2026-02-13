//src/config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/*export async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set');
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('MongoDB connected');
}
import mongoose from 'mongoose';*/

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI not set');
  }

  await mongoose.connect(process.env.MONGO_URI);

  console.log('MongoDB Connected');
};


