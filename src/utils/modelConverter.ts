import { transformer } from '@openfga/syntax-transformer';
import type { OpenFGAModel } from '../types/models';

// DSL <-> JSON conversion is delegated to OpenFGA's official ANTLR-based
// transformer (the same grammar the `fga` CLI uses). A previous hand-rolled
// parser lived here but only supported a subset of the DSL: it mis-handled
// `[type#relation with condition]` and had no support for `and` (intersection)
// or `but not` (difference). Those gaps produced relation names containing
// spaces, which OpenFGA rejects with a 400
// (`invalid RelationReference.Relation: value does not match regex ...`).

export function dslToJson(dsl: string): OpenFGAModel {
  return transformer.transformDSLToJSONObject(dsl) as unknown as OpenFGAModel;
}

export function jsonToDsl(model: OpenFGAModel): string {
  return transformer.transformJSONToDSL(
    model as unknown as Parameters<typeof transformer.transformJSONToDSL>[0]
  );
}
