import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { ProjectList } from './components/ProjectList';
import { MetricCard } from './components/MetricCard';
import { useAppDispatch, useAppSelector } from './hooks/useAppDispatch';
import { fetchProjects } from './store/slices/projectsSlice';
import { trackPageView } from './services/analytics';

export function App() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector(state => state.projects);
  const user = useAppSelector(state => state.auth.user);

  useEffect(() => {
    trackPageView('Dashboard');
    dispatch(fetchProjects());
  }, [dispatch]);

  return (
    <div className="dashboard-container">
      <Header user={user} />
      <div className="metrics-grid">
        <MetricCard label="Active Projects" value={items.length} />
        <MetricCard label="Build Status" value="Healthy" />
      </div>
      <ProjectList projects={items} isLoading={loading} />
    </div>
  );
}

export default App;
