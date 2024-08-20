import useSWR, { SWRResponse, Fetcher, SWRConfiguration } from "swr";
import { Arguments } from "swr/_internal";

interface QueryDefinition<
  Data = any,
  Params = any,
  Error = any,
  SWROptions = any,
> {
  type: "query";
  execute: (params: Params, config?: SWROptions) => SWRResponse<Data, Error>;
}

type Key<Params extends any[] = any[]> =
  | Arguments
  | ((...args: Params) => Arguments);

type ResolvedKey<T> = T extends (...args: any[]) => infer R ? R : T;

type ResolvedKeyParams<T> = T extends (args: infer P) => any ? P : any;

interface EndpointBuilder {
  query<
    Data = any,
    Error = any,
    SWRKey extends Key<ResolvedKeyParams<SWRKey>> = Key,
    SWROptions extends
      | SWRConfiguration<Data, Error, Fetcher<Data, SWRKey>>
      | undefined =
      | SWRConfiguration<Data, Error, Fetcher<Data, SWRKey>>
      | undefined,
  >(
    key: SWRKey,
    fetcher: Fetcher<Data, SWRKey>,
    config?: SWROptions,
  ): QueryDefinition<Data, ResolvedKeyParams<SWRKey>, Error>;
}

type ExtractQueryEndpoints<Map, Data, Params, Error> = {
  [K in keyof Map as Map[K] extends QueryDefinition<Data, Params, Error>
    ? `use${Capitalize<string & K>}Query`
    : never]: Map[K] extends QueryDefinition<Data, Params, Error>
    ? Map[K]["execute"]
    : never;
};

export function createApi<
  Data = any,
  Error = any,
  SWRKey extends Key<ResolvedKeyParams<SWRKey>> = Key,
  SWROptions extends
    | SWRConfiguration<Data, Error, Fetcher<Data, SWRKey>>
    | undefined =
    | SWRConfiguration<Data, Error, Fetcher<Data, SWRKey>>
    | undefined,
  EndpointMap extends Record<
    string,
    QueryDefinition<Data, ResolvedKeyParams<SWRKey>, Error, SWROptions>
  > = any,
>({
  endpoints,
}: {
  endpoints: (builder: EndpointBuilder) => EndpointMap;
}): ExtractQueryEndpoints<EndpointMap, Data, ResolvedKeyParams<SWRKey>, Error> {
  type ExtractQueryEndpointsTyped = ExtractQueryEndpoints<
    EndpointMap,
    Data,
    ResolvedKeyParams<SWRKey>,
    Error
  >;

  const builder: EndpointBuilder = {
    query(key, fetcher, config) {
      return {
        type: "query",
        execute: (...args) => {
          const resolvedKey =
            typeof key === "function" ? key(...(args as any)) : key;
          return useSWR(resolvedKey, fetcher, config);
        },
      };
    },
  };

  const endpointMap = endpoints(builder);

  const queryEndpoints = Object.entries(endpointMap)
    .filter(([_, value]) => value.type === "query")
    .reduce((acc, [key, value]) => {
      const prefixedKey =
        `use${capitalize(key)}Query` as keyof ExtractQueryEndpoints<
          EndpointMap,
          Data,
          ResolvedKeyParams<SWRKey>,
          Error
        >;
      acc[prefixedKey] =
        value.execute as ExtractQueryEndpointsTyped[typeof prefixedKey];
      return acc;
    }, {} as ExtractQueryEndpointsTyped);

  return { ...queryEndpoints };
}

// Utility function to capitalize the first letter of a string
function capitalize<T extends string>(s: T): Capitalize<T> {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<T>;
}
