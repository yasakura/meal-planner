import { conviveInitials, type Convive } from '../../../domain/entities/convive';
import { type Menu, type Presence } from '../../../domain/entities/menu';
import { type Repas } from '../../../domain/entities/repas';
import { type MenuDay, type SlotPresence } from './menu-days';

function invitesLabel(invites: number): string {
  return invites > 1 ? `${invites} invités` : `${invites} invité`;
}

function presenceDuRepas(
  repas: Repas,
  repasIndex: number,
  foyer: readonly Convive[],
  quand: string,
): SlotPresence {
  return {
    repasIndex,
    chips: foyer.map((convive) => ({
      id: convive.id,
      initials: conviveInitials(convive),
      label: `${convive.name} au repas de ${quand}`,
      present: repas.presents === null || repas.presents.includes(convive.id),
    })),
    invitesLabel: invitesLabel(repas.invites),
    addInviteLabel: `Ajouter un invité au repas de ${quand}`,
    removeInviteLabel: `Retirer un invité au repas de ${quand}`,
    removeInviteDisabled: repas.invites === 0,
  };
}

export function withPresence(days: MenuDay[], menu: Menu, foyer: readonly Convive[]): MenuDay[] {
  return days.map((day) => ({
    ...day,
    slots: day.slots.map((slot) => ({
      ...slot,
      presence: presenceDuRepas(
        menu.repas[slot.address.repasIndex] as Repas,
        slot.address.repasIndex,
        foyer,
        `${day.label}, ${slot.creneauLabel}`,
      ),
    })),
  }));
}

export function presenceAvecConviveBascule(
  repas: Repas,
  foyer: readonly Convive[],
  conviveId: string,
): Presence {
  const presents = repas.presents ?? foyer.map((convive) => convive.id);
  return {
    presents: presents.includes(conviveId)
      ? presents.filter((id) => id !== conviveId)
      : [...presents, conviveId],
    invites: repas.invites,
  };
}

export function presenceAvecInvites(repas: Repas, invites: number): Presence {
  return { presents: repas.presents === null ? null : [...repas.presents], invites };
}
