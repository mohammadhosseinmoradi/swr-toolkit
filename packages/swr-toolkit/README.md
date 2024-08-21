# SWR-Toolkit

**An efficient and opinionated approach for work with SWR.**

**SWR-Toolkit** offers an efficient and opinionated approach to working with SWR. This package provides a set of utilities and abstractions that simplify common patterns,
enabling you to integrate SWR seamlessly into your application with minimal boilerplate.

Whether you're building a complex data-driven application or just need a straightforward solution for managing server
state, **SWR-Toolkit** delivers a convenient, well-structured way to leverage SWR's powerful features. It helps you
maintain clean, readable code while ensuring that your data fetching operations are performant and easy to manage.

## Key Features

- **Hooks**: Easily generate custom hooks for your API endpoints.
- **SSR**: Easily generate utility functions for data fetching in the server and SSR environments.
- **Type Safety**: Ensure that your API responses are type-safe with TypeScript.

## Installation

```bash
#pnpm
pnpm add swr-toolkit

#yarn
yarn add swr-toolkit

#npm
npm add swr-toolkit
```

## Basic Usage

Here’s a step-by-step guide to usage:

### First Create an API Instance

Define your API endpoints and configure data fetching using the `createApi` function. Create a file for your API
configuration (e.g., `product-api.ts`).

```typescript
// product-api.ts

import { createApi } from "swr-toolkit";

const productApi = createApi({
  endpoints: (builder) => ({
    getProducts: builder.query("/products", async (key) => {
      const response = await fetch(key);
      return (await response.json()) as Result<Product[]>;
    }),
    addProduct: builder.mutation(
      (product: AddProduct) => {
        return {
          endpoint: `/products`,
          body: product,
        };
      },
      async (key) => {
        const response = await fetch(key.endpoint, {
          method: "POST",
          body: JSON.stringify(key.body),
        });
        return (await response.json()) as Result<Product>;
      },
    ),
  }),
});

export default productApi;
```

### Second import the API Instance

Import the api instance that you created in `product-api.ts` into your component.

```tsx
import productApi from "./product-api";

export default function Products() {
  const { data } = productApi.useGetProductsQuery();
  const { trigger } = productApi.useAddProductMutation();

  return (
    <div>
      {JSON.stringify(data)}
      <button
        onClick={() =>
          triger({
            name: "Product name",
          })
        }
      >
        Add
      </button>
    </div>
  );
}
```

## Documentation

For more detailed information on advanced usage, configuration options, and API features, please refer to the **[SWR-Toolkit Documentation](#)**.
