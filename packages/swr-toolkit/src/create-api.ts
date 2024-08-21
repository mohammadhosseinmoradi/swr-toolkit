import useSWR, { SWRResponse, Fetcher } from "swr";
import { Arguments, mergeConfigs, SWRConfiguration } from "swr/_internal";

interface QueryDefinition<
  Data = any,
  Error = any,
  SWRKey extends Key = any,
  SWROptions = SWRConfiguration<Data, Error, ResolvedFetcher<Data, SWRKey>>,
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

type ResolvedFetcher<Data = any, SWRKey extends Key = Key> = Fetcher<
  Data,
  ResolvedKey<SWRKey>
>;

interface EndpointBuilder {
  query<Data = any, Error = any, SWRKey extends Key = Key>(
    key: SWRKey,
    fetcher: ResolvedFetcher<Data, SWRKey>,
    config?: SWRConfiguration<Data, Error, ResolvedFetcher<Data, SWRKey>>,
  ): QueryDefinition<Data, Error, SWRKey>;
}

type ExtractQueryEndpoints<
  Map,
  Data = any,
  Error = any,
  SWRKey extends Key = any,
  SWROptions = any,
> = {
  [K in keyof Map as Map[K] extends QueryDefinition<
    Data,
    Error,
    SWRKey,
    SWROptions
  >
    ? `use${Capitalize<string & K>}Query`
    : never]: Map[K] extends QueryDefinition<Data, Error, SWRKey, SWROptions>
    ? Map[K]["hook"]
    : never;
};

export function createApi<
  EndpointMap extends Record<string, QueryDefinition> = any,
>({
  endpoints,
}: {
  endpoints: (builder: EndpointBuilder) => EndpointMap;
}): ExtractQueryEndpoints<EndpointMap> {
  const builder: EndpointBuilder = {
    query(key, fetcher, config) {
      return {
        type: "query",
        execute: (...args) => {
          const [resolvedKey, configOverride] = normalize(key, ...args);
          return useSWR(
            resolvedKey,
            fetcher,
            mergeConfigs(config || ({} as any), configOverride as any) as any,
          );
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

export const normalize = (key: any, ...args: any) => {
  let resolvedKey = typeof key === "function" ? key(args?.[0]) : key;
  let configOverride = args?.[1] || {};
  if (args.length > 1) {
    resolvedKey = typeof key === "function" ? key(args?.[0]) : key;
    configOverride = args?.[1] || {};
  } else if (typeof key === "function" && key.length > 0) {
    resolvedKey = key(args?.[0]);
  } else {
    configOverride = args?.[0] || ({} as any);
  }
  return [resolvedKey, configOverride];
};
