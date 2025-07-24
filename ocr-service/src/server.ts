import { createApp } from "./app";
import config from "./config";

const app = createApp();
const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`✅ OCR service is running at http://localhost:${PORT}`);
});
