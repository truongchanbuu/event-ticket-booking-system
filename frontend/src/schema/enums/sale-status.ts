import { z } from "zod";

export const SaleStatus = z.enum(["ONSALE", "PAUSED", "SOLD_OUT", "ENDED"]);
