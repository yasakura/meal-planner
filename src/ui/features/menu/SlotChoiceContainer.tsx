import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadCatalogue, selectCatalogue } from '../catalogue/catalogue-slice';
import { FROM_MENU_DRAFT } from '../recipe-detail/recipe-detail-origin';
import { selectMenu, slotRecipeChosen } from './menu-slice';
import { slotChoiceViewOf } from './slot-choice';
import { slotAddressOf } from './slot-choice-route';
import { SlotChoiceScreen } from './SlotChoiceScreen';

export function SlotChoiceContainer() {
  const address = slotAddressOf(useParams());
  const brouillon = useAppSelector(selectMenu).menu;
  const catalogue = useAppSelector(selectCatalogue);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(loadCatalogue());
  }, [dispatch]);

  const choisir = (recipeId: string) => {
    dispatch(slotRecipeChosen({ address, recipeId }));
    void navigate(FROM_MENU_DRAFT.backLink.href);
  };

  return (
    <SlotChoiceScreen
      view={slotChoiceViewOf(brouillon, catalogue, address)}
      back={FROM_MENU_DRAFT.backLink}
      onChoose={choisir}
      onRetry={() => dispatch(loadCatalogue())}
    />
  );
}
