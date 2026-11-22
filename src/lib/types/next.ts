export type PageProps<Params extends Record<string, string> = Record<string, string>> = {
  params: Promise<Params>;
  searchParams?: Promise<Record<string, string | undefined>>;
};