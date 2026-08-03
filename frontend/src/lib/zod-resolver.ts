import { zodResolver } from "@hookform/resolvers/zod";
import type { Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * zodResolver typed against the schema's OUTPUT type.
 *
 * @hookform/resolvers types the resolver with zod's INPUT type, which differs
 * from the output for `z.coerce.number()` and friends (input is `unknown`).
 * react-hook-form requires the resolver's field type to match the form type
 * (`useForm<Output>`), so those schemas fail to compile.
 *
 * Runtime behaviour is unchanged: the resolver still validates and coerces.
 */
export function zodResolverTyped<Schema extends z.ZodType<any, any, any>>(
  schema: Schema,
): Resolver<z.output<Schema>> {
  return zodResolver(schema) as unknown as Resolver<z.output<Schema>>;
}
