import styled from 'styled-components';
import { Link } from 'react-router-dom';

import { UNITS, type Unit } from '../../../domain/entities/ingredient';
import { tokens } from '../../theme/tokens';

const { colors, radii, space, fonts } = tokens;

export type IngredientRow = {
  name: string;
  quantity: string;
  unit: Unit;
};

export type RecipeCreateScreenProps = {
  title: string;
  convives: number;
  rows: IngredientRow[];
  instructions: string;
  onTitleChange: (value: string) => void;
  onConvivesChange: (value: number) => void;
  onInstructionsChange: (value: string) => void;
  onRowChange: (index: number, patch: Partial<IngredientRow>) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  submitLabel: string;
  confirmation: string | null;
  errorMessage: string | null;
};

const Page = styled.div`
  min-height: 100dvh;
  background: ${colors.creme};
  display: flex;
  flex-direction: column;
  padding: ${space.lg}px;
`;

const BackLink = styled(Link)`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.inkSecondary};
  text-decoration: none;
  margin-bottom: ${space.lg}px;
`;

const Title = styled.h1`
  font-family: ${fonts.serif};
  font-size: 28px;
  color: ${colors.ink};
  margin: 0 0 ${space.xl}px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${space.md}px;
`;

const Field = styled.div``;

const Label = styled.label`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
  margin-bottom: ${space.xs}px;
  display: block;
`;

// Intitulé de section (ex. « Ingrédients ») : même poids/teinte que les labels de champ,
// pour une hiérarchie interne homogène. Non lié à un contrôle → simple <p>.
const SectionLabel = styled.p`
  font-family: ${fonts.body};
  font-size: 13px;
  color: ${colors.inkSecondary};
  margin: ${space.sm}px 0 0;
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  background: ${colors.sand};
  border: none;
  border-radius: ${radii.sm};
  padding: ${space.md}px;
  font-family: ${fonts.body};
  font-size: 16px;
  color: ${colors.ink};
`;

const Textarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  background: ${colors.sand};
  border: none;
  border-radius: ${radii.sm};
  padding: ${space.md}px;
  font-family: ${fonts.body};
  font-size: 16px;
  color: ${colors.ink};
  resize: vertical;
`;

const Select = styled.select`
  width: 100%;
  box-sizing: border-box;
  background: ${colors.sand};
  border: none;
  border-radius: ${radii.sm};
  padding: ${space.md}px;
  font-family: ${fonts.body};
  font-size: 16px;
  color: ${colors.ink};
`;

const IngredientRowBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${space.sm}px;
  padding: ${space.md}px;
  background: ${colors.white};
  border-radius: ${radii.md};
`;

const RemoveButton = styled.button`
  align-self: flex-end;
  background: none;
  border: none;
  color: ${colors.terracotta};
  font-family: ${fonts.body};
  font-size: 13px;
  padding: 0;
`;

const AddButton = styled.button`
  align-self: flex-start;
  background: none;
  border: 1px solid ${colors.hairline};
  border-radius: ${radii.sm};
  color: ${colors.ink};
  font-family: ${fonts.body};
  font-size: 14px;
  padding: ${space.sm}px ${space.md}px;
`;

const SubmitButton = styled.button`
  width: 100%;
  background: ${colors.terracotta};
  color: ${colors.white};
  border: none;
  border-radius: ${radii.sm};
  padding: ${space.md}px;
  font-family: ${fonts.body};
  font-size: 16px;
  margin-top: ${space.sm}px;

  &:disabled {
    opacity: 0.6;
  }
`;

const Confirmation = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.sage};
  margin: ${space.sm}px 0 0;
`;

const ErrorMessage = styled.p`
  font-family: ${fonts.body};
  font-size: 14px;
  color: ${colors.terracotta};
  margin: ${space.sm}px 0 0;
`;

function unitLabel(unit: Unit): string {
  return unit === 'piece' ? 'pièce' : unit;
}

export function RecipeCreateScreen(props: RecipeCreateScreenProps) {
  return (
    <Page>
      <BackLink to="/catalogue">← Recettes</BackLink>
      <Title>Nouvelle recette</Title>

      <Form
        onSubmit={(event) => {
          event.preventDefault();
          props.onSubmit();
        }}
      >
        <Field>
          <Label htmlFor="recipe-title">Titre</Label>
          <Input
            id="recipe-title"
            name="title"
            type="text"
            value={props.title}
            onChange={(event) => props.onTitleChange(event.target.value)}
          />
        </Field>

        <Field>
          <Label htmlFor="recipe-convives">Personnes</Label>
          <Input
            id="recipe-convives"
            name="convives"
            type="number"
            min={1}
            value={props.convives}
            onChange={(event) => props.onConvivesChange(Number(event.target.value))}
          />
        </Field>

        <SectionLabel>Ingrédients</SectionLabel>

        {props.rows.map((row, index) => (
          <IngredientRowBox key={index}>
            <Field>
              <Label htmlFor={`ingredient-name-${index}`}>Nom</Label>
              <Input
                id={`ingredient-name-${index}`}
                type="text"
                value={row.name}
                onChange={(event) => props.onRowChange(index, { name: event.target.value })}
              />
            </Field>

            <Field>
              <Label htmlFor={`ingredient-quantity-${index}`}>Quantité</Label>
              <Input
                id={`ingredient-quantity-${index}`}
                type="number"
                min={0}
                value={row.quantity}
                onChange={(event) => props.onRowChange(index, { quantity: event.target.value })}
              />
            </Field>

            <Field>
              <Label htmlFor={`ingredient-unit-${index}`}>Unité</Label>
              <Select
                id={`ingredient-unit-${index}`}
                value={row.unit}
                onChange={(event) => props.onRowChange(index, { unit: event.target.value as Unit })}
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unitLabel(unit)}
                  </option>
                ))}
              </Select>
            </Field>

            <RemoveButton
              type="button"
              aria-label="Retirer l'ingrédient"
              onClick={() => props.onRemoveRow(index)}
            >
              Retirer
            </RemoveButton>
          </IngredientRowBox>
        ))}

        <AddButton type="button" onClick={props.onAddRow}>
          Ajouter un ingrédient
        </AddButton>

        <Field>
          <Label htmlFor="recipe-instructions">Préparation</Label>
          <Textarea
            id="recipe-instructions"
            name="instructions"
            rows={6}
            value={props.instructions}
            onChange={(event) => props.onInstructionsChange(event.target.value)}
          />
        </Field>

        <SubmitButton type="submit" disabled={props.submitDisabled}>
          {props.submitLabel}
        </SubmitButton>

        {props.confirmation !== null && (
          <Confirmation role="status">{props.confirmation}</Confirmation>
        )}
        {props.errorMessage !== null && (
          <ErrorMessage role="alert">{props.errorMessage}</ErrorMessage>
        )}
      </Form>
    </Page>
  );
}
