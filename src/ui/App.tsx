import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './Layout';
import { CatalogueContainer } from './features/catalogue/CatalogueContainer';
import { MenuContainer } from './features/menu/MenuContainer';
import { RecipeDetailContainer } from './features/recipe-detail/RecipeDetailContainer';
import { RecipeCreateContainer } from './features/recipe/RecipeCreateContainer';
import { RecipeEditContainer } from './features/recipe/RecipeEditContainer';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/catalogue" element={<CatalogueContainer />} />
        {/* Segment statique déclaré avant la route dynamique :id (React Router v6 le classe
            de toute façon en premier ; les ids réels sont des cuid2, jamais « nouvelle »). */}
        <Route path="/catalogue/nouvelle" element={<RecipeCreateContainer />} />
        <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
        <Route path="/catalogue/:id/modifier" element={<RecipeEditContainer />} />
        <Route path="/menu" element={<MenuContainer />} />
        <Route path="/" element={<Navigate to="/catalogue" replace />} />
      </Route>
    </Routes>
  );
}
