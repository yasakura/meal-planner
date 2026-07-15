import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './Layout';
import { CatalogueContainer } from './features/catalogue/CatalogueContainer';
import { RecipeDetailContainer } from './features/recipe-detail/RecipeDetailContainer';
import { RecipeCreateContainer } from './features/recipe/RecipeCreateContainer';

function CatalogueHome() {
  return (
    <>
      <CatalogueContainer />
      <RecipeCreateContainer />
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/catalogue" element={<CatalogueHome />} />
        <Route path="/catalogue/:id" element={<RecipeDetailContainer />} />
        <Route path="/" element={<Navigate to="/catalogue" replace />} />
      </Route>
    </Routes>
  );
}
