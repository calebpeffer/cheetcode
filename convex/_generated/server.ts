/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (ctx: any, args: any) => any;

type Definition = {
  args?: unknown;
  handler: Handler;
};

export function mutation(definition: Definition) {
  return definition;
}

export function query(definition: Definition) {
  return definition;
}

export function action(definition: Definition) {
  return definition;
}
