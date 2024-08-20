"use client";

import { createApi } from "swr-toolkit";

export default function Page() {
  const { data } = api.useGetUsersQuery({
    id: "",
  });

  return (
    <div>
      <button onClick={() => {}}>revalidate</button>
    </div>
  );
}

const api = createApi({
  endpoints: (builder) => ({
    getUsers: builder.query(
      ({ id }: { id: string }) => "https://jsonplaceholder.typicode.com/users",
      async (key) => {
        const response = await fetch(key);
        return (await response.json()) as { id: string; name: string }[];
      },
    ),
  }),
});
