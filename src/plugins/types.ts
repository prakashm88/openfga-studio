import type { Edge, Node, XYPosition } from 'reactflow';
import type { OpenFGAModel } from '../types/models';

export interface GraphViewContext {
  /** The text in the model editor, as DSL or JSON. */
  model: string;
  /** The editor text as OpenFGA JSON, or null when the text is not a valid model. */
  modelJson: OpenFGAModel | null;
  storeId: string;
  storeName: string;
}

/** A React Flow node. The Studio lays out the nodes that have no position. */
export type GraphViewNode = Omit<Node, 'position'> & { position?: XYPosition };

export interface GraphViewResult {
  nodes: GraphViewNode[];
  edges: Edge[];
}

export interface GraphView {
  /** A unique ID. "model" is the built-in view. */
  id: string;
  /** The text on the view button above the graph. */
  label: string;
  build(context: GraphViewContext): GraphViewResult | Promise<GraphViewResult>;
}

export interface StudioPluginApi {
  apiVersion: 1;
  registerGraphView(view: GraphView): void;
}

/** The default export of a plugin module. */
export type StudioPlugin = (studio: StudioPluginApi) => void | Promise<void>;
