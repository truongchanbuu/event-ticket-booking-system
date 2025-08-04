// This file defines the API endpoints and maps them to the controller functions.

import { Router } from 'express';

import { createTicket, getTickets } from '../controllers/ticketController.js';

const router = Router();

// Define a POST endpoint to create a new ticket.
router.post('/', createTicket);

// Define a GET endpoint to retrieve all tickets.
router.get('/', getTickets);

export default router;
