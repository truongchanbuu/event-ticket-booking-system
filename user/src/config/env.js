import dotenv from "dotenv";
dotenv.config();

export const ENV = {
    NODE_ENV: process.env.NODE_ENV || "development",
    SERVICE_NAME: process.env.SERVICE_NAME || "",
    PORT: process.env.PORT ? +process.env.PORT : 3000,
};
