// This is the main entry point for the microservice. It sets up the Express server and registers the ticket-specific routes.

import express from 'express';
// The import path is now relative to the 'src' directory, so we can point directly to routes.
import ticketRoutes from './routes/ticketRoutes.js';

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Use the ticket routes under the '/tickets' endpoint
app.use('/tickets', ticketRoutes);

// Define a simple root route for health check
app.get('/', (req, res) => {
  res.send('Ticket Service is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Ticket Service listening on port ${PORT}`);
});
