// This file contains the business logic for handling ticket-related requests, using Redis for data persistence and Kafka for event publishing.

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
// Import the sendKafkaMessage function from your new Kafka service file.
import { sendKafkaMessage } from '../services/kafkaService.js';

const redis = new Redis({
  host: 'redis',
  port: 6379
});

export const createTicket = async (req, res) => {
  const { eventId, userId, seatNumber } = req.body;

  if (!eventId || !userId || !seatNumber) {
    return res.status(400).json({ error: 'Missing required fields: eventId, userId, or seatNumber' });
  }

  const ticketId = uuidv4();
  const newTicket = {
    id: ticketId,
    eventId,
    userId,
    seatNumber,
    status: 'booked',
    createdAt: new Date().toISOString(),
  };

  try {
    await redis.hset(`ticket:${ticketId}`, newTicket);
    await redis.sadd('ticket_ids', ticketId);

    // Publish an event to Kafka after the ticket is created.
    // The message will be published to the 'tickets.created' topic.
    await sendKafkaMessage('tickets.created', [{
      value: JSON.stringify(newTicket),
    }]);

    console.log(`New ticket created and stored in Redis: ${JSON.stringify(newTicket)}`);
    res.status(201).json(newTicket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

export const getTickets = async (req, res) => {
  try {
    const ticketIds = await redis.smembers('ticket_ids');

    if (ticketIds.length === 0) {
      return res.status(200).json([]);
    }

    const ticketPromises = ticketIds.map(id => redis.hgetall(`ticket:${id}`));
    const tickets = await Promise.all(ticketPromises);

    console.log(`Retrieved ${tickets.length} tickets from Redis.`);
    res.status(200).json(tickets);
  } catch (error) {
    console.error('Error retrieving tickets from Redis:', error);
    res.status(500).json({ error: 'Failed to retrieve tickets' });
  }
};
