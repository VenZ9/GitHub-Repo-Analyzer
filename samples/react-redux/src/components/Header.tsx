import React from 'react';
import { User } from '../store/slices/authSlice';

interface HeaderProps {
  user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header className="header">
      <div className="logo">Project DNA Dashboard</div>
      <div className="user-profile">
        <span>{user ? user.name : 'Guest'}</span>
      </div>
    </header>
  );
};
