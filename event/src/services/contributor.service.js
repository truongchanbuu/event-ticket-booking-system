import { CONTRIBUTORS_COLLECTION } from "../config/constants/collection.js";

export class ContributorService {
    constructor({ db }) {
        this.contributorsCollection = db.collection(CONTRIBUTORS_COLLECTION);
    }

    async findOrCreate(contributorData, tx) {
        const now = new Date().toISOString();
        let contributorID = contributorData.contributorID;

        if (contributorID) {
            const docRef = this.contributorsCollection.doc(contributorID);
            const doc = tx ? await tx.get(docRef) : await docRef.get();
            if (!doc.exists) {
                throw new Error(
                    `Contributor with ID ${contributorID} does not exist.`,
                );
            }
            return { id: doc.id, data: doc.data() };
        } else {
            const docRef = this.contributorsCollection.doc();
            contributorID = docRef.id;
            const newContributor = {
                contributorID,
                fullName: contributorData.fullName || null,
                photoUrl: contributorData.photoUrl || null,
                createdAt: now,
            };

            if (tx) {
                tx.set(docRef, newContributor);
            } else {
                await docRef.set(newContributor);
            }
            return { id: contributorID, data: newContributor };
        }
    }
}
