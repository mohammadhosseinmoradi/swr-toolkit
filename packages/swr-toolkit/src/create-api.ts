import useSWR, { SWRResponse, Fetcher, SWRConfiguration } from "swr";
import { Arguments } from "swr/_internal";

interface QueryDefinition<
  Data = any,
  SWRKey = any,
  Error = any,
  SWROptions = any,
> {
  type: "query";
  execute: (params: SWRKey, config?: SWROptions) => SWRResponse<Data, Error>;
  hook: SWRKey extends () => any
    ? (config?: SWROptions) => SWRResponse<Data, Error>
    : SWRKey extends (arg: infer Arg) => any
      ? (arg: Arg, config?: SWROptions) => SWRResponse<Data, Error>
      : (config?: SWROptions) => SWRResponse<Data, Error>;
}

type Key = Arguments | ((args: any) => Arguments);

type ResolvedKey<T extends Key> = T extends (...args: any) => infer R
  ? R extends Key
    ? R
    : never
  : T;

type ResolvedFetcher<Data, SWRKey extends Key> = Fetcher<
  Data,
  ResolvedKey<SWRKey>
>;

interface EndpointBuilder {
  query<
    Data = any,
    Error = any,
    SWRKey extends Key = Key,
    SWROptions extends
      | SWRConfiguration<Data, Error, ResolvedFetcher<Data, SWRKey>>
      | undefined =
      | SWRConfiguration<Data, Error, ResolvedFetcher<Data, SWRKey>>
      | undefined,
  >(
    key: SWRKey,
    fetcher: ResolvedFetcher<Data, SWRKey>,
    config?: SWROptions,
  ): QueryDefinition<Data, SWRKey, Error, SWROptions>;
}

type ExtractQueryEndpoints<Map, Data = any, SWRKey = any, Error = any> = {
  [K in keyof Map as Map[K] extends QueryDefinition<Data, SWRKey, Error>
    ? `use${Capitalize<string & K>}Query`
    : never]: Map[K] extends QueryDefinition<Data, SWRKey, Error>
    ? Map[K]["hook"]
    : never;
};

export function createApi<
  EndpointMap extends Record<string, QueryDefinition> = any,
>({ endpoints }: { endpoints: (builder: EndpointBuilder) => EndpointMap }) {
  const builder: EndpointBuilder = {
    query(key, fetcher, config) {
      return {
        type: "query",
        execute: (args) => {
          const resolvedKey = typeof key === "function" ? key(args) : key;
          return useSWR(resolvedKey, fetcher, config);
        },
        hook: this.query as any,
      };
    },
  };

  const endpointMap = endpoints(builder);

  const queryEndpoints = Object.entries(endpointMap)
    .filter(([_, value]) => value.type === "query")
    .reduce((acc, [key, value]) => {
      const prefixedKey =
        `use${capitalize(key)}Query` as keyof ExtractQueryEndpoints<EndpointMap>;
      acc[prefixedKey] =
        value.execute as ExtractQueryEndpoints<EndpointMap>[typeof prefixedKey];
      return acc;
    }, {} as ExtractQueryEndpoints<EndpointMap>);

  return { ...queryEndpoints };
}

// Utility function to capitalize the first letter of a string
function capitalize<T extends string>(s: T): Capitalize<T> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<T>;
}
