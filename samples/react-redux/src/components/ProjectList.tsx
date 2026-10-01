import React from 'react';
import { Project } from '../types/index';

interface ProjectListProps {
  projects: Project[];
  isLoading: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, isLoading }) => {
  if (isLoading) return <div>Loading repositories...</div>;
  return (
    <ul className="project-list">
      {projects.map(p => (
        <li key={p.id}>
          <strong>{p.name}</strong> - <span>{p.status}</span>
        </li>
      ))}
    </ul>
  );
};
