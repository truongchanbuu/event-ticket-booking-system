// TODO: Refactor this Repo to the SERVICE

import {
    EVENTS_COLLECTION,
    TICKET_TYPES_SUBCOLLECTION,
} from "../config/constants/collection.js";

export class TicketTypeSnapshotRepo {
    /**
     * @param {object} deps
     * @param {import('firebase-admin/firestore').Firestore} deps.db - Instance của Firestore Admin SDK
     * @param {object} deps.logger
     */
    constructor({ db, logger }) {
        this.db = db;
        this.logger = logger;
    }

    /**
     * Lấy tham chiếu đến một document snapshot của ticket type.
     * @private
     * @param {string} eventId - ID của sự kiện cha.
     * @param {string} ticketTypeId - ID của ticket type (dùng làm ID cho document).
     * @returns {import('firebase-admin/firestore').DocumentReference}
     */
    _getDocRef(eventId, ticketTypeId) {
        return this.db
            .collection(EVENTS_COLLECTION)
            .doc(eventId)
            .collection(TICKET_TYPES_SUBCOLLECTION)
            .doc(ticketTypeId);
    }

    async getById(eventId, ticketTypeId) {
        const docRef = this._getDocRef(eventId, ticketTypeId);
        const snapshot = await docRef.get();
        const data = snapshot.data();

        if (!snapshot.exists) {
            this.logger.warn(`No ticket found.`, {
                eventId,
                ticketTypeId,
            });
            throw new TicketNotFoundError("Ticket Not Found");
        }

        return data;
    }

    /**
     * Tạo hoặc ghi đè một snapshot ticket type trong subcollection của một event.
     * @param {string} eventId - ID của sự kiện.
     * @param {string} ticketTypeId - ID của loại vé, cũng là ID của document.
     * @param {object} data - Dữ liệu cần lưu (không bao gồm ID).
     * @returns {Promise<void>}
     */
    async createOrUpdate(eventId, ticketTypeId, data) {
        const eventRef = this.db.collection(EVENTS_COLLECTION).doc(eventId);
        const ticketTypeRef = eventRef
            .collection(TICKET_TYPES_SUBCOLLECTION)
            .doc(ticketTypeId);

        await this.db.runTransaction(async (transaction) => {
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists) {
                this.logger.warn(
                    `Attempted to create ticket type for a non-existent event.`,
                    { eventId, ticketTypeId },
                );
                throw new EventNotFoundError("Event Not Found");
            }

            this.logger.info(
                `Parent event '${eventId}' found. Creating ticket type snapshot '${ticketTypeId}'.`,
            );

            transaction.set(ticketTypeRef, data);
        });
    }

    /**
     * Cập nhật các trường cụ thể của một snapshot.
     * @param {string} eventId
     * @param {string} ticketTypeId
     * @param {object} changes - Các trường cần thay đổi.
     * @returns {Promise<void>}
     */
    async update(eventId, ticketTypeId, changes) {
        const docRef = this._getDocRef(eventId, ticketTypeId);
        this.logger.info(`Updating data for document at path: ${docRef.path}`);
        await docRef.update(changes);
    }

    /**
     * Xóa một snapshot ticket type.
     * @param {string} eventId
     * @param {string} ticketTypeId
     * @returns {Promise<void>}
     */
    async delete(eventId, ticketTypeId) {
        const docRef = this._getDocRef(eventId, ticketTypeId);
        this.logger.info(`Deleting document at path: ${docRef.path}`);
        await docRef.delete();
    }
}
