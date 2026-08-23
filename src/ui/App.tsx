import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './Layout';
import { CatalogueContainer } from './features/catalogue/CatalogueContainer';
import { MenuContainer } from './features/menu/MenuContainer';
import { MenuCreateContainer } from './features/menu/MenuCreateContainer';
import { SLOT_CHOICE_ROUTE } from './features/menu/slot-choice-route';
import { SlotChoiceContainer } from './features/menu/SlotChoiceContainer';
import { RecipeDetailContainer } from './features/recipe-detail/RecipeDetailContainer';
import { RecipeCreateContainer } from './features/recipe/RecipeCreateContainer';
import { RecipeEditContainer } from './features/recipe/RecipeEditContainer';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/catalogue" element={<CatalogueContainer />} />
        <Route path="/catalogue/nouvelle" element={<RecipeCreateContainer />} />
        <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
        <Route path="/catalogue/:id/modifier" element={<RecipeEditContainer />} />
        <Route path="/menu" element={<MenuContainer />} />
        <Route path="/menu/nouveau" element={<MenuCreateContainer />} />
        <Route path={SLOT_CHOICE_ROUTE} element={<SlotChoiceContainer />} />
        <Route path="/" element={<Navigate to="/catalogue" replace />} />
      </Route>
    </Routes>
  );
}
