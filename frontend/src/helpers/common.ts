export function convertToInt(decimal: any) {
    const intValue = Math.floor(decimal);
    return intValue.toLocaleString('vi-VN');
}

export function convertDate(isoString?: string | null): string {
    if (!isoString || isoString === "null" || isoString === "undefined") return "N/A";

    const date = new Date(isoString);

    // Nếu không phải ngày hợp lệ → trả về N/A
    if (isNaN(date.getTime())) return "N/A";

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${hours}:${minutes} ${day}/${month}/${year}`;
}