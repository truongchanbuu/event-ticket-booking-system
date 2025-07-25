import { createApp } from "./app";
import config from "./config";

const PORT = config.port || 5000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`✅ OCR service is running at http://localhost:${PORT}`);
});
