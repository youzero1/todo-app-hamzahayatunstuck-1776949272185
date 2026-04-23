'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '@/types';
import TodoInput from '@/components/TodoInput';
import TodoItem from '@/components/TodoItem';
import FilterBar, { type FilterType } from '@/components/FilterBar';
import { getSupabaseClient } from '@/lib/supabase';

const STORAGE_KEY = 'todo-app-items';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loaded, setLoaded] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);

  const supabase = getSupabaseClient();

  // Load todos from Supabase or localStorage
  useEffect(() => {
    async function loadTodos() {
      if (supabase) {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setUseSupabase(true);
          const mapped: Todo[] = data.map((row: { id: string; text: string; completed: boolean; created_at: string }) => ({
            id: row.id,
            text: row.text,
            completed: row.completed,
            createdAt: row.created_at,
          }));
          setTodos(mapped);
          setLoaded(true);
          return;
        }
      }

      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setTodos(JSON.parse(stored));
        }
      } catch (_e) {
        // ignore
      }
      setLoaded(true);
    }

    loadTodos();
  }, [supabase]);

  // Persist to localStorage when not using Supabase
  useEffect(() => {
    if (!loaded || useSupabase) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (_e) {
      // ignore
    }
  }, [todos, loaded, useSupabase]);

  const addTodo = useCallback(
    async (text: string) => {
      const newTodo: Todo = {
        id: generateId(),
        text,
        completed: false,
        createdAt: new Date().toISOString(),
      };

      if (useSupabase && supabase) {
        const { error } = await supabase.from('todos').insert({
          id: newTodo.id,
          text: newTodo.text,
          completed: newTodo.completed,
          created_at: newTodo.createdAt,
        });
        if (error) {
          console.error('Failed to insert todo:', error);
          return;
        }
      }

      setTodos((prev) => [newTodo, ...prev]);
    },
    [useSupabase, supabase]
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      if (useSupabase && supabase) {
        const { error } = await supabase
          .from('todos')
          .update({ completed: !todo.completed })
          .eq('id', id);
        if (error) {
          console.error('Failed to update todo:', error);
          return;
        }
      }

      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
    },
    [todos, useSupabase, supabase]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      if (useSupabase && supabase) {
        const { error } = await supabase.from('todos').delete().eq('id', id);
        if (error) {
          console.error('Failed to delete todo:', error);
          return;
        }
      }

      setTodos((prev) => prev.filter((t) => t.id !== id));
    },
    [useSupabase, supabase]
  );

  const clearCompleted = useCallback(async () => {
    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    if (completedIds.length === 0) return;

    if (useSupabase && supabase) {
      const { error } = await supabase
        .from('todos')
        .delete()
        .in('id', completedIds);
      if (error) {
        console.error('Failed to clear completed:', error);
        return;
      }
    }

    setTodos((prev) => prev.filter((t) => !t.completed));
  }, [todos, useSupabase, supabase]);

  const filteredTodos = todos.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="text-indigo-600">✓</span> Todo App
          </h1>
          <p className="text-gray-500">
            Organize your day, one task at a time
          </p>
          {useSupabase && (
            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Connected to Supabase
            </span>
          )}
          {!useSupabase && (
            <span className="inline-block mt-2 px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
              Using local storage
            </span>
          )}
        </div>

        {/* Input */}
        <div className="mb-6">
          <TodoInput onAdd={addTodo} />
        </div>

        {/* Filter bar */}
        {todos.length > 0 && (
          <div className="mb-4">
            <FilterBar
              filter={filter}
              onFilterChange={setFilter}
              counts={counts}
            />
          </div>
        )}

        {/* Todo list */}
        <div className="flex flex-col gap-2">
          {filteredTodos.length === 0 && todos.length > 0 && (
            <div className="text-center py-10 text-gray-400">
              No {filter === 'all' ? '' : filter} tasks found
            </div>
          )}

          {filteredTodos.length === 0 && todos.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-400 text-lg">No todos yet</p>
              <p className="text-gray-300 text-sm mt-1">
                Add your first task above!
              </p>
            </div>
          )}

          {filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))}
        </div>

        {/* Footer actions */}
        {counts.completed > 0 && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={clearCompleted}
              className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Clear completed ({counts.completed})
            </button>
          </div>
        )}

        {/* Stats */}
        {todos.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {counts.all}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                Total
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {counts.active}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                Active
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {counts.completed}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                Done
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
