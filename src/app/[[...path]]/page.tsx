import { PataMatchApp } from "@/components/patamatch-app";

export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  return <PataMatchApp path={path} />;
}
