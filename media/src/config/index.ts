import "dotenv/config";

export default {
    port: process.env.PORT,
    app_name: "event-ticket-booking-system",
    cloudinary: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    },
};
