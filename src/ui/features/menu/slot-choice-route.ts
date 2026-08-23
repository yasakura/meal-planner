import { type SlotAddress } from '../../../domain/entities/menu';

const CHOISIR_UN_CRENEAU = '/menu/nouveau/choisir';

export const SLOT_CHOICE_ROUTE = `${CHOISIR_UN_CRENEAU}/:repasIndex/:slotIndex`;

export function slotChoiceHref(address: SlotAddress): string {
  return `${CHOISIR_UN_CRENEAU}/${address.repasIndex}/${address.slotIndex}`;
}

export function slotAddressOf(params: Readonly<Record<string, string | undefined>>): SlotAddress {
  return { repasIndex: Number(params.repasIndex), slotIndex: Number(params.slotIndex) };
}
