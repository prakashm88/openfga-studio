import type { GraphView, StudioPlugin, StudioPluginApi } from './types';

export const MODEL_VIEW_ID = 'model';

export interface LoadedPlugins {
  graphViews: GraphView[];
  /** One message for each plugin that failed to load. */
  errors: string[];
}

let loading: Promise<LoadedPlugins> | null = null;

/** Loads the plugin modules that STUDIO_PLUGINS lists in config.json. Later calls return the same result. */
export function loadPlugins(): Promise<LoadedPlugins> {
  loading ??= loadAll();
  return loading;
}

async function readPluginUrls(): Promise<string[]> {
  try {
    // The container writes config.json at startup. Without it (npm run dev), there are no plugins.
    const response = await fetch('config.json', { cache: 'no-store' });
    if (!response.ok) {
      return [];
    }
    const config = await response.json();
    const plugins: unknown = config?.STUDIO_PLUGINS;
    return Array.isArray(plugins)
      ? plugins.filter((plugin): plugin is string => typeof plugin === 'string' && plugin.length > 0)
      : [];
  } catch {
    return [];
  }
}

async function loadAll(): Promise<LoadedPlugins> {
  const graphViews: GraphView[] = [];
  const errors: string[] = [];

  const api: StudioPluginApi = {
    apiVersion: 1,
    registerGraphView(view) {
      if (!view || !view.id || !view.label || typeof view.build !== 'function') {
        throw new Error('registerGraphView needs an id, a label and a build function');
      }
      if (view.id === MODEL_VIEW_ID || graphViews.some((existing) => existing.id === view.id)) {
        throw new Error(`a graph view with the id "${view.id}" already exists`);
      }
      graphViews.push(view);
    },
  };

  // Load in order, so that the view buttons have the same order as STUDIO_PLUGINS.
  for (const entry of await readPluginUrls()) {
    try {
      const url = new URL(entry, document.baseURI).href;
      const module = await import(/* @vite-ignore */ url);
      const register: unknown = module.default;
      if (typeof register !== 'function') {
        throw new Error('the module has no default export function');
      }
      await (register as StudioPlugin)(api);
    } catch (error) {
      console.error(`Failed to load the Studio plugin ${entry}:`, error);
      errors.push(`${entry}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { graphViews, errors };
}
