// index.js - The main entry point for your Payment Service microservice
import app from './src/app.js'; // Import the Express app from src/app.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirname equivalent for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file, which is in the same directory as index.js
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = process.env.PAYMENT_PORT || 3002; // Use the port defined in .env or default

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
  console.log(`Access Payment APIs at http://localhost:${PORT}`);
});