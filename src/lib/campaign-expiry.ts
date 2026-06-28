const vietnamTimeZone = "Asia/Ho_Chi_Minh";

function getVietnamDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: vietnamTimeZone,
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

function getDateKey(value?: string | null): string | null {
  const rawValue = value?.trim();

  if (!rawValue) {
    return null;
  }

  const dateOnlyMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);

  if (dateOnlyMatch) {
    return dateOnlyMatch[1];
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return getVietnamDateKey(parsedDate);
}

export function isCampaignExpired(endDate?: string | null, now = new Date()) {
  const endDateKey = getDateKey(endDate);

  if (!endDateKey) {
    return false;
  }

  return endDateKey < getVietnamDateKey(now);
}
