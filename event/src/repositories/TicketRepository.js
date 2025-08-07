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
     * @param {string} eventID - ID của sự kiện cha.
     * @param {string} ticketTypeID - ID của ticket type (dùng làm ID cho document).
     * @returns {import('firebase-admin/firestore').DocumentReference}
     */
    _getDocRef(eventID, ticketTypeID) {
        return this.db
            .collection(EVENTS_COLLECTION)
            .doc(eventID)
            .collection(TICKET_TYPES_SUBCOLLECTION)
            .doc(ticketTypeID);
    }

    async getById(eventID, ticketTypeID) {
        const docRef = this._getDocRef(eventID, ticketTypeID);
        const snapshot = await docRef.get();
        const data = snapshot.data();

        if (!snapshot.exists) {
            this.logger.warn(`No ticket found.`, {
                eventID,
                ticketTypeID,
            });
            throw new TicketNotFoundError("Ticket Not Found");
        }

        return data;
    }

    /**
     * Tạo hoặc ghi đè một snapshot ticket type trong subcollection của một event.
     * @param {string} eventID - ID của sự kiện.
     * @param {string} ticketTypeID - ID của loại vé, cũng là ID của document.
     * @param {object} data - Dữ liệu cần lưu (không bao gồm ID).
     * @returns {Promise<void>}
     */
    async createOrUpdate(eventID, ticketTypeID, data) {
        const eventRef = this.db.collection(EVENTS_COLLECTION).doc(eventID);
        const ticketTypeRef = eventRef
            .collection(TICKET_TYPES_SUBCOLLECTION)
            .doc(ticketTypeID);

        await this.db.runTransaction(async (transaction) => {
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists) {
                this.logger.warn(
                    `Attempted to create ticket type for a non-existent event.`,
                    { eventID, ticketTypeID },
                );
                throw new EventNotFoundError("Event Not Found");
            }

            this.logger.info(
                `Parent event '${eventID}' found. Creating ticket type snapshot '${ticketTypeID}'.`,
            );

            transaction.set(ticketTypeRef, data);
        });
    }

    /**
     * Cập nhật các trường cụ thể của một snapshot.
     * @param {string} eventID
     * @param {string} ticketTypeID
     * @param {object} changes - Các trường cần thay đổi.
     * @returns {Promise<void>}
     */
    async update(eventID, ticketTypeID, changes) {
        const docRef = this._getDocRef(eventID, ticketTypeID);
        this.logger.info(`Updating data for document at path: ${docRef.path}`);
        await docRef.update(changes);
    }

    /**
     * Xóa một snapshot ticket type.
     * @param {string} eventID
     * @param {string} ticketTypeID
     * @returns {Promise<void>}
     */
    async delete(eventID, ticketTypeID) {
        const docRef = this._getDocRef(eventID, ticketTypeID);
        this.logger.info(`Deleting document at path: ${docRef.path}`);
        await docRef.delete();
    }
}
