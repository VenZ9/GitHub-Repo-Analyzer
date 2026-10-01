export interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived' | 'draft';
  repository: string;
}
