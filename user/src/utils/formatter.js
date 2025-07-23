export function formatE164PhoneNumber(phone) {
    if (!phone.startsWith("+")) {
        return `+84${phone.replace(/^0/, "")}`;
    }
    return phone;
}

export function normalizeBirthday(birthday) {
    if (!birthday) return undefined;
    const dateObj =
        typeof birthday === "string" ? new Date(birthday) : birthday;
    return dateObj.toISOString();
}
