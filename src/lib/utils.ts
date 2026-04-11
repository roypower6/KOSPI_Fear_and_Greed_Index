import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSentimentColor(value: number) {
  if (value <= 25) return "text-red-600";
  if (value <= 45) return "text-orange-500";
  if (value <= 55) return "text-yellow-500";
  if (value <= 75) return "text-green-500";
  return "text-green-700";
}

export function getSentimentBg(value: number) {
  if (value <= 25) return "bg-red-600";
  if (value <= 45) return "bg-orange-500";
  if (value <= 55) return "bg-yellow-500";
  if (value <= 75) return "bg-green-500";
  return "bg-green-700";
}

export function getSentimentLabel(value: number) {
  if (value <= 25) return "극도의 공포 (Extreme Fear)";
  if (value <= 45) return "공포 (Fear)";
  if (value <= 55) return "중립 (Neutral)";
  if (value <= 75) return "탐욕 (Greed)";
  return "극도의 탐욕 (Extreme Greed)";
}
