import dotenv from 'dotenv';
dotenv.config();

const KAFKA_PORT_DEFAULT = 9092;
const KAFKA_PORT = process.env.KAFKA_BROKER_PORT || KAFKA_PORT_DEFAULT;
const KAFKA_BROKER_DEFAULT = `192.168.174.120:${KAFKA_PORT}`;

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  KAFKA_PORT,
  PORT: process.env.PORT ? +process.env.PORT : 3000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  KAFKA_BROKER_1: process.env.KAFKA_BROKER_1
    ? `${process.env.KAFKA_BROKER_1}:${KAFKA_PORT}`
    : KAFKA_BROKER_DEFAULT,
  KAFKA_BROKER_2: process.env.KAFKA_BROKER_2
    ? `${process.env.KAFKA_BROKER_2}:${KAFKA_PORT}`
    : KAFKA_BROKER_DEFAULT,
  KAFKA_BROKER_3: process.env.KAFKA_BROKER_3
    ? `${process.env.KAFKA_BROKER_3}:${KAFKA_PORT}`
    : KAFKA_BROKER_DEFAULT,
};
