import React from 'react';

export default function SearchBar({ value, onChange, onGet }) {
  return (
    <div className="search-container">
      <input
        className="search-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search commodity (e.g., Cotton)"
        onKeyDown={(e) => e.key === 'Enter' && onGet()}
      />
    </div>
  );
}