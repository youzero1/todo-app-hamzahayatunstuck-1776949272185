'use client';

import { useState } from 'react';

export default function TodoInput({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    onAdd(trimmed);
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={text}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        placeholder="What needs to be done?"
        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-base"
      />
      <button
        type="submit"
        className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Add
      </button>
    </form>
  );
}
