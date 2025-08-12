export function makeDoc(initial = {}) {
    let data = { ...initial };
    const ref = {
        id: initial.paymentIntentID || initial.id || "pi_test",
        async get() {
            return { exists: true, data: () => ({ ...data }) };
        },
        async update(patch) {
            data = { ...data, ...patch };
        },
        _dump() {
            return data;
        },
    };
    return ref;
}

export function makePaymentCollection({ docRef }) {
    return {
        doc: (id) => (id ? docRef : docRef),
        // where('reservationID' == rid).limit(1).get()
        where: (field, op, value) => ({
            limit: () => ({
                async get() {
                    const d = docRef._dump();
                    const match =
                        field === "reservationID" &&
                        op === "==" &&
                        d.reservationID === value;
                    return {
                        docs: match ? [{ id: docRef.id, data: () => d }] : [],
                    };
                },
            }),
        }),
    };
}

export function makeFirestore({ docRef }) {
    return {
        // only routes we use in PaymentService
        collection(name) {
            if (name === "paymentIntents") {
                return makePaymentCollection({ docRef });
            }
            // paymentMethods stubs (not used in these tests)
            return {
                where: () => ({
                    orderBy: () => ({
                        orderBy: () => ({
                            get: async () => ({ empty: true, docs: [] }),
                        }),
                    }),
                }),
                doc: () => ({
                    get: async () => ({ exists: false, data: () => ({}) }),
                }),
            };
        },
        // naive transaction: collect updates then commit
        async runTransaction(fn) {
            const ops = [];
            await fn({
                async get(ref) {
                    return { exists: true, data: () => ref._dump() };
                },
                update(ref, patch) {
                    ops.push(() => ref.update(patch));
                },
            });
            for (const op of ops) await op();
        },
        batch() {
            return { update() {}, async commit() {} };
        },
    };
}
