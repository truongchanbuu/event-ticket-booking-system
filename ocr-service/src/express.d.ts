interface CustomRequestData {
  imagesToProcess?: { index: number; base64Image: string; hash: string }[];
  cachedResults?: { index: number; result: any }[];
}

declare global {
  namespace Express {
    export interface Request extends CustomRequestData {}
  }
}

export {};
