export function phoneNumberFromId(id: string) {
  return `+${id.split("@")[0].split(":")[0]}`;
}
