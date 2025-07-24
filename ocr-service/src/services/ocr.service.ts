// TODO: "Cache" me if you can - with check-orc-cache
import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient();

export const extractTextFromImage = async (
  base64Image: string
): Promise<{ fullText: string; confidence: number }> => {
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");

  const [result] = await client.textDetection({ image: { content: buffer } });

  const confidence = result.fullTextAnnotation?.pages?.[0]?.confidence ?? 0;
  const fullText = result.fullTextAnnotation?.text;

  if (!fullText) {
    throw new Error("No text found in image");
  }

  return { fullText, confidence };
};
