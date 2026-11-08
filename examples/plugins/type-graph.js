// An example OpenFGA Studio plugin. It adds a "Types" graph view with one node for each type.
// An edge from type A to type B means that a relation on B accepts A as a directly related user type.
// The edge label lists those relations.

const MAX_LABEL_RELATIONS = 3;

function edgeLabel(relations) {
  if (relations.length <= MAX_LABEL_RELATIONS) {
    return relations.join(', ');
  }
  return `${relations.slice(0, MAX_LABEL_RELATIONS).join(', ')} +${relations.length - MAX_LABEL_RELATIONS}`;
}

export default function register(studio) {
  studio.registerGraphView({
    id: 'type-graph',
    label: 'Types',
    build({ modelJson }) {
      if (!modelJson) {
        return { nodes: [], edges: [] };
      }

      const definitions = modelJson.type_definitions ?? [];
      const typeNames = new Set(definitions.map((definition) => definition.type));
      const relationsByEdge = new Map();

      for (const definition of definitions) {
        for (const [relation, metadata] of Object.entries(definition.metadata?.relations ?? {})) {
          for (const userType of metadata.directly_related_user_types ?? []) {
            if (userType.type === definition.type || !typeNames.has(userType.type)) {
              continue;
            }
            const id = `${userType.type}->${definition.type}`;
            const edge = relationsByEdge.get(id) ?? { source: userType.type, target: definition.type, relations: [] };
            if (!edge.relations.includes(relation)) {
              edge.relations.push(relation);
            }
            relationsByEdge.set(id, edge);
          }
        }
      }

      return {
        nodes: definitions.map((definition) => ({
          id: definition.type,
          data: { label: definition.type, type: 'type' },
        })),
        edges: [...relationsByEdge].map(([id, edge]) => ({
          id,
          source: edge.source,
          target: edge.target,
          label: edgeLabel(edge.relations),
        })),
      };
    },
  });
}
