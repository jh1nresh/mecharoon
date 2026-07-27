import { randomUUID } from "node:crypto";

export type Runtime = {
  now(): Date;
  id(prefix: string): string;
};

export const systemRuntime: Runtime = {
  now: () => new Date(),
  id: (prefix) => `${prefix}_${randomUUID().replaceAll("-", "")}`,
};

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function createDeterministicRuntime(
  start: Date = new Date("2026-07-26T00:00:00.000Z"),
): Runtime {
  let counter = 0;

  return {
    now: () => new Date(start.getTime() + counter * 1000),
    id: (prefix) => {
      counter += 1;
      return `${prefix}_${counter.toString().padStart(4, "0")}`;
    },
  };
}
