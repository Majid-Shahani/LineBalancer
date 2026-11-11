import { LineProvider } from './context/LineProvider.jsx';
import { useLine } from './context/LineContext.js';
import HeaderBar from './components/HeaderBar.jsx';
import JsonDrawer from './components/JsonDrawer.jsx';
import RecipeView from './views/RecipeView/RecipeView.jsx';
import LayoutStagePlaceholder from './views/LayoutView/LayoutStagePlaceholder.jsx';
import RunStageView from './views/RunView/RunStageView.jsx';

function WorkbenchContent() {
  const { activeStage, isJsonDrawerOpen } = useLine();

  const renderNonRecipeStage = () => {
    if (isJsonDrawerOpen) {
      return (
        <div className="wb-stage-container">
          <JsonDrawer />
        </div>
      );
    }
    if (activeStage === 'layout') return <LayoutStagePlaceholder />;
    return <RunStageView />;
  };

  return (
    <div className="wb-shell">
      <HeaderBar />
      <div className="wb-main-area">
        <main className="wb-workspace">
          {activeStage === 'recipe' ? <RecipeView /> : renderNonRecipeStage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LineProvider>
      <WorkbenchContent />
    </LineProvider>
  );
}
