import { createBrowserRouter, useParams } from 'react-router-dom';
import { ProtectedRoute } from './protected-route';
import CharactersPage from '../pages/characters/characters';
import LoginPage from '../pages/login/login';
import App from '../App';
import CharacterCreation from '../pages/character-creation/character-creation-page';
import CharacterPage from '../pages/character/character-page';
import { CharacterCreationProvider } from '../contexts/character-creation-provider';

function CharacterCreator() {
  const { characterId } = useParams();
  if (!characterId) {
    return null;
  }

  return (
    <CharacterCreationProvider characterId={characterId}>
      <CharacterCreation />
    </CharacterCreationProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: App,
    children: [
      {
        Component: ProtectedRoute,
        children: [
          {
            index: true,
            Component: CharactersPage
          },
          {
            path: 'character/:characterId',
            Component: CharacterPage
          },
          {
            path: 'character-creation/:characterId',
            Component: CharacterCreator
          }
        ]
      },
      {
        path: '/login',
        Component: LoginPage
      }
    ]
  }
]);
