import { type AppThunk } from '../../store/store';
import { catalogueRetried } from '../catalogue/catalogue-slice';
import { convivesRetried } from '../convives/convives-slice';
import { sourcesEnPanne } from './liste-de-courses-view';
import { savedMenusRetried } from './saved-menus-slice';

export function coursesRelancees(): AppThunk {
  return (dispatch, getState) => {
    const { savedMenus, catalogue, convives } = getState();
    const aRouvrir = sourcesEnPanne(savedMenus, catalogue, convives);
    if (aRouvrir.includes('menus')) dispatch(savedMenusRetried());
    if (aRouvrir.includes('catalogue')) dispatch(catalogueRetried());
    if (aRouvrir.includes('foyer')) dispatch(convivesRetried());
  };
}
