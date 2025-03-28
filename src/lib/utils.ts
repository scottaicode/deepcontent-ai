import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges class names efficiently with Tailwind CSS
 * Uses clsx for conditional classes and tailwind-merge to handle conflicting classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
} 