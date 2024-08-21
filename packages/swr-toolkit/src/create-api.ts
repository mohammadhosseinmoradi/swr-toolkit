import useSWR, { SWRResponse, Fetcher } from "swr";
import { Arguments, mergeConfigs, SWRConfiguration } from "swr/_internal";
import useSWRMutation, {
  MutationFetcher,
  SWRMutationConfiguration,
  SWRMutationResponse,
} from "swr/mutation";

interface QueryDefinition<
  Data = any,
  Error = any,
  SWRKey extends Key = Key,
  SWROptions = SWRConfiguration<Data, Error, ResolvedFetcher<Data, SWRKey>>,
> {
  type: "query";
  hook: SWRKey extends () => any
    ? (config?: SWROptions) => SWRResponse<Data, Error>
    : SWRKey extends (arg: infer Arg) => any
      ? (arg: Arg, config?: SWROptions) => SWRResponse<Data, Error>
      : (config?: SWROptions) => SWRResponse<Data, Error>;
}

interface MutationDefinition<
  Data = any,
  Error = any,
  SWRMutationKey extends Key = Key,
  ExtraArg = any,
  SWROptions = SWRMutationConfiguration<
    Data,
    Error,
    SWRMutationKey,
    ExtraArg,
    Data
  >,
> {
  type: "mutation";
  hook: SWRMutationKey extends () => any
    ? (
        config?: SWROptions,
      ) => SWRMutationResponse<Data, Error, SWRMutationKey, ExtraArg>
    : SWRMutationKey extends (arg: infer Arg) => any
      ? (
          arg: Arg,
          config?: SWROptions,
        ) => SWRMutationResponse<Data, Error, SWRMutationKey, ExtraArg>
      : (
          config?: SWROptions,
        ) => SWRMutationResponse<Data, Error, SWRMutationKey, ExtraArg>;
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

type ResolvedMutationFetcher<
  Data,
  SWRMutationKey extends Key,
  ExtraArg,
> = MutationFetcher<Data, ResolvedKey<SWRMutationKey>, ExtraArg>;

interface EndpointBuilder {
  query<Data = any, Error = any, SWRKey extends Key = Key>(
    key: SWRKey,
    fetcher: ResolvedFetcher<Data, SWRKey>,
    config?: SWRConfiguration<Data, Error, ResolvedFetcher<Data, SWRKey>>,
  ): QueryDefinition<Data, Error, SWRKey>;

  mutation<
    Data = any,
    Error = any,
    SWRMutationKey extends Key = Key,
    ExtraArg = any,
  >(
    key: SWRMutationKey,
    fetcher: ResolvedMutationFetcher<Data, SWRMutationKey, ExtraArg>,
    options?: SWRMutationConfiguration<Data, Error, SWRMutationKey, ExtraArg>,
  ): MutationDefinition<Data, Error, SWRMutationKey, ExtraArg>;
}

type ExtractQueryEndpoints<
  Map,
  Data = any,
  Error = any,
  SWRKey extends Key = Key,
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

type ExtractMutationEndpoints<
  Map,
  Data = any,
  Error = any,
  SWRMutationKey extends Key = Key,
  ExtraArg = any,
  SWROptions = any,
> = {
  [K in keyof Map as Map[K] extends MutationDefinition<
    Data,
    Error,
    SWRMutationKey,
    ExtraArg,
    SWROptions
  >
    ? `use${Capitalize<string & K>}Mutation`
    : never]: Map[K] extends MutationDefinition<
    Data,
    Error,
    SWRMutationKey,
    ExtraArg,
    SWROptions
  >
    ? Map[K]["hook"]
    : never;
};

export function createApi<
  EndpointMap extends Record<
    string,
    QueryDefinition | MutationDefinition
  > = any,
>({
  endpoints,
}: {
  endpoints: (builder: EndpointBuilder) => EndpointMap;
}): ExtractQueryEndpoints<EndpointMap> & ExtractMutationEndpoints<EndpointMap> {
  const builder: EndpointBuilder = {
    query(key, fetcher, config) {
      return {
        type: "query",
        hook: (...args: any) => {
          const [resolvedKey, configOverride] = normalize(key, ...args);
          return useSWR(
            resolvedKey,
            fetcher,
            mergeConfigs(config || ({} as any), configOverride as any) as any,
          );
        },
      } as any;
    },
    mutation(key, mutationFetcher, options) {
      return {
        type: "mutation",
        hook: (...args: any) => {
          const [resolvedKey, configOverride] = normalize(key, ...args);
          return useSWRMutation(
            resolvedKey,
            mutationFetcher,
            mergeConfigs(options || ({} as any), configOverride as any) as any,
          );
        },
      } as any;
    },
  };

  const endpointMap = endpoints(builder);

  const queryEndpoints = Object.entries(endpointMap)
    .filter(([_, value]) => value.type === "query")
    .reduce((acc, [key, value]) => {
      const prefixedKey =
        `use${capitalize(key)}Query` as keyof ExtractQueryEndpoints<EndpointMap>;
      acc[prefixedKey] =
        value.hook as ExtractQueryEndpoints<EndpointMap>[typeof prefixedKey];
      return acc;
    }, {} as ExtractQueryEndpoints<EndpointMap>);

  const mutationEndpoints = Object.entries(endpointMap)
    .filter(([_, value]) => value.type === "mutation")
    .reduce((acc, [key, value]) => {
      const prefixedKey =
        `use${capitalize(key)}Mutation` as keyof ExtractMutationEndpoints<EndpointMap>;
      acc[prefixedKey] =
        value.hook as ExtractMutationEndpoints<EndpointMap>[typeof prefixedKey];
      return acc;
    }, {} as ExtractMutationEndpoints<EndpointMap>);

  return { ...queryEndpoints, ...mutationEndpoints };
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
