"use client";

import { createApi } from "swr-toolkit";

export default function Page() {
  const { isLoading, data, mutate } = api.useGetUsersQuery(
    {
      endpoint: "/users",
    },
    {
      onSuccess: (data) => {
        console.log("data");
      },
    },
  );

  return (
    <div>
      <button onClick={() => {}}>revalidate</button>
    </div>
  );
}

type User = {
  email: string;
  id: number;
  name: string;
  phone: string;
  username: string;
  website: string;
};

const api = createApi({
  endpoints: (builder) => ({
    getUsers: builder.query(
      ({ endpoint }: { endpoint: string }) =>
        `https://jsonplaceholder.typicode.com${endpoint}`,
      // "https://jsonplaceholder.typicode.com/users",
      async (key) => {
        const response = await fetch(key);
        return (await response.json()) as User[];
      },
      {
        onSuccess: (data, key, config) => {
          console.log("asdfdas");
        },
      },
    ),
  }),
});
