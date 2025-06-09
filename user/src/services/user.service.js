import { db } from "../firebase";

export default class UserService {
    constructor({ logger }) {
        this.logger = logger;
        this.userCollection = db.collection("users");
    }

    async getUsers(query) {
        const {
            page = 1,
            limit = 20,
            search,
            role,
            status,
            organizerStatus,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = query;

        const offset = (page - 1) * limit;
        let firebaseQuery = this.userCollection;

        if (role) firebaseQuery = firebaseQuery.where("role", "==", role);
        if (status) firebaseQuery = firebaseQuery.where("status", "==", status);
        if (organizerStatus)
            firebaseQuery = firebaseQuery.where(
                "organizerStatus",
                "==",
                organizerStatus,
            );

        firebaseQuery = firebaseQuery.orderBy(
            sortBy,
            sortOrder === "asc" ? "asc" : "desc",
        );
        const snapshot = await firebaseQuery.get();
        let users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        if (search) {
            const s = search.toLowerCase();
            users = users.filter((user) =>
                [user.username, user.email].some((field) =>
                    field?.toLowerCase().includes(s),
                ),
            );
        }

        const total = users.length;
        const paginatedUsers = users.slice(offset, offset + limit);

        return {
            page,
            limit: limit,
            total,
            users: paginatedUsers,
        };
    }
}
