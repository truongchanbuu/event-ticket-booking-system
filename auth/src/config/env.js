import dotenv from "dotenv";
dotenv.config();

export default ENV = {
    NODE_ENV: process.env.NODE_ENV,
    SERVICE_NAME: process.env.SERVICE_NAME,
    LOG_LEVEL: process.env.LOG_LEVEL,
    PORT: +process.env.PORT || 3000,
};
