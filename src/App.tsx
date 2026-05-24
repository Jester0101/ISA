import { SceneView } from './components/SceneView';
import { TopBar } from './components/TopBar';
import { Overlays } from './components/Overlays';
import { TitleScreen } from './components/TitleScreen';
import { Toasts } from './components/Toasts';
import { useGame } from './engine/store';

function App() {
  const gameStarted = useGame(s => s.gameStarted);
  const begin = useGame(s => s.begin);

  if (!gameStarted) {
    return (
      <div className="w-full h-full">
        <TitleScreen onBegin={begin} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden grain vignette">
      <SceneView />
      <TopBar />
      <Overlays />
      <Toasts />
    </div>
  );
}

export default App;
