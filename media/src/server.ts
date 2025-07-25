import app from "./app";
import config from "./config";

const PORT = config.port || 5002;

app.listen(PORT, () => {
    console.log(`Media service listening on port ${PORT}`);
});
