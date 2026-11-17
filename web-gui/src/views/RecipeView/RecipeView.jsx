import { useState } from 'react';
import { useLine } from '../../context/LineContext.js';
import ItemsPanel from './ItemsPanel.jsx';
import OperationsPanel from './OperationsPanel.jsx';
import RecipeGraph from './RecipeGraph.jsx';
import JsonDrawer from '../../components/JsonDrawer.jsx';

export default function RecipeView() {
  const { isJsonDrawerOpen } = useLine();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div
      className={`wb-recipe-stage ${
        isSidebarCollapsed ? 'is-sidebar-collapsed' : ''
      }`}
    >
      {!isSidebarCollapsed && (
        <div className="wb-recipe-left">
          <ItemsPanel />
          <OperationsPanel />
        </div>
      )}

      <div className="wb-recipe-right">
        {isJsonDrawerOpen ? (
          <JsonDrawer />
        ) : (
          <RecipeGraph
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((v) => !v)}
          />
        )}
      </div>
    </div>
  );
}
