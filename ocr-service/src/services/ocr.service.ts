import { visionClient } from "../lib/clients";
interface ImageToProcess {
  index: number;
  base64Image: string;
  hash: string;
}

/**
 * Gửi một (batch) ảnh đến Google Vision API để xử lý.
 * @param images Mảng các object ảnh cần xử lý.
 * @returns Một mảng kết quả tương ứng.
 */
export const processImageBatch = async (images: ImageToProcess[]) => {
  if (images.length === 0) {
    return [];
  }

  const requests = images.map(({ base64Image }) => ({
    image: { content: base64Image },
    features: [
      {
        type: "DOCUMENT_TEXT_DETECTION" as const,
      },
    ],
  }));

  const [batchResult] = await visionClient.batchAnnotateImages({ requests });
  const responses = batchResult.responses || [];

  return responses.map((response, i) => {
    const originalImage = images[i];
    if (response.error) {
      return {
        index: originalImage.index,
        status: "failed",
        text: null,
        confidence: 0,
      };
    }

    const confidence = response.fullTextAnnotation?.pages?.[0]?.confidence || 0;
    const fullText = response.fullTextAnnotation?.text || "";
    const status = confidence < 0.7 ? "blurry" : "ok";

    return {
      index: originalImage.index,
      status,
      text: fullText,
      confidence,
      hash: originalImage.hash,
    };
  });
};
