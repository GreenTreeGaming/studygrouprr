import { Filter } from "bad-words";

const filter = new Filter();

export function containsInappropriateContent(
  text: string
) {
  return filter.isProfane(text);
}