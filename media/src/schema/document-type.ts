export const DOCUMENT_TYPES = [
    "id_card_front",
    "id_card_back",
    "business_license",
    "event_permit",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];
