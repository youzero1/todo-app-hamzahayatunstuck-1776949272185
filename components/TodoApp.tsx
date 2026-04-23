'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '@/types';
import TodoInput from '@/components/TodoInput';
import TodoItem from '@/components/TodoItem';
import FilterBar, { type FilterType } from '@/components/FilterBar';
import { getSupabaseClient } from '@/lib/supabase';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all todos from Supabase
  const fetchTodos = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch todos:', fetchError);
        setError('Failed to load todos. Make sure the database table exists and RLS policies are set.');
        setLoaded(true);
        return;
      }

      const mapped: Todo[] = (data || []).map(
        (row: { id: string; text: string; completed: boolean; created_at: string }) => ({
          id: row.id,
          text: row.text,
          completed: row.completed,
          createdAt: row.created_at,
        })
      );
      setTodos(mapped);
      setError(null);
    } catch (err) {
      console.error('Supabase connection error:', err);
      setError('Could not connect to Supabase. Check your environment variables.');
    } finally {
      setLoaded(true);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  // Subscribe to realtime changes
  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabaseClient>['channel']> | null = null;

    try {
      const supabase = getSupabaseClient();
      channel = supabase
        .channel('todos-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'todos' },
          () => {
            // Re-fetch on any change to stay in sync
            fetchTodos();
          }
        )
        .subscribe();
    } catch (_err) {
      // Supabase not available, skip realtime
    }

    return () => {
      if (channel) {
        try {
          const supabase = getSupabaseClient();
          supabase.removeChannel(channel);
        } catch (_err) {
          // ignore
        }
      }
    };
  }, [fetchTodos]);

  const addTodo = useCallback(async (text: string) => {
    try {
      const supabase = getSupabaseClient();
      const newId = generateId();
      const now = new Date().toISOString();

      // Optimistic update
      const optimisticTodo: Todo = {
        id: newId,
        text,
        completed: false,
        createdAt: now,
      };
      setTodos((prev) => [optimisticTodo, ...prev]);

      const { error } = await supabase.from('todos').insert({
        id: newId,
        text,
        completed: false,
        created_at: now,
      });

      if (error) {
        console.error('Failed to insert todo:', error);
        // Rollback optimistic update
        setTodos((prev) => prev.filter((t) => t.id !== newId));
        setError('Failed to add todo.');
      }
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  }, []);

  const toggleTodo = useCallback(
    async (id: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      // Optimistic update
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );

      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('todos')
          .update({ completed: !todo.completed })
          .eq('id', id);

        if (error) {
          console.error('Failed to update todo:', error);
          // Rollback
          setTodos((prev) =>
            prev.map((t) => (t.id === id ? { ...t, completed: todo.completed } : t))
          );
        }
      } catch (err) {
        console.error('Error toggling todo:', err);
        // Rollback
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, completed: todo.completed } : t))
        );
      }
    },
    [todos]
  );

  const deleteTodo = useCallback(async (id: string) => {
    // Optimistic update — keep ref for rollback
    let removedTodo: Todo | undefined;
    setTodos((prev) => {
      removedTodo = prev.find((t) => t.id === id);
      return prev.filter((t) => t.id !== id);
    });

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('todos').delete().eq('id', id);

      if (error) {
        console.error('Failed to delete todo:', error);
        // Rollback
        if (removedTodo) {
          setTodos((prev) => [removedTodo!, ...prev]);
        }
      }
    } catch (err) {
      console.error('Error deleting todo:', err);
      if (removedTodo) {
        setTodos((prev) => [removedTodo!, ...prev]);
      }
    }
  }, []);

  const clearCompleted = useCallback(async () => {
    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    if (completedIds.length === 0) return;

    // Optimistic update
    const previousTodos = [...todos];
    setTodos((prev) => prev.filter((t) => !t.completed));

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('todos')
        .delete()
        .in('id', completedIds);

      if (error) {
        console.error('Failed to clear completed:', error);
        setTodos(previousTodos);
      }
    } catch (err) {
      console.error('Error clearing completed:', err);
      setTodos(previousTodos);
    }
  }, [todos]);

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
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
          <p className="text-gray-400 text-sm">Loading todos from database…</p>
        </div>
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
          <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            ● Live — Supabase connected
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

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
