export function extractPublicIdFromUrl(url: string): string {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) throw new Error("Invalid Cloudinary URL");

    // Cắt ra phần sau /upload/
    const pathWithVersion = url.substring(uploadIndex + "/upload/".length);
    const parts = pathWithVersion.split("/");

    // Nếu phần tiếp theo là version (vd: v1234567) thì bỏ nó
    const versionRegex = /^v\d+$/;
    if (versionRegex.test(parts[0])) {
        parts.shift();
    }

    // Bỏ đuôi ảnh (.png, .jpg, .webp, ...)
    const lastPart = parts.pop()!;
    const noExtension = lastPart.split(".")[0];
    parts.push(noExtension);

    return parts.join("/");
}
