/**
 * @description This function normalizes Brazilian phone numbers.
 * The internal WhatsApp ID (JID) for Brazilian phone numbers does not include the extra digit 9,
 * which is commonly used in Brazil.
 *
 * @param phoneNumber The phone number to normalize.
 * @returns The phone number without the extra digit 9.
 */
export function normalizeBrazilPhoneNumber(phoneNumber: string): string {
  const match = phoneNumber.match(/\+55(\d{2})9?(\d{8})/);
  if (!match) {
    return phoneNumber;
  }
  const [, ddd, number] = match;
  return `+55${ddd}${number}`;
}
