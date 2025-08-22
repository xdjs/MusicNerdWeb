import ClientWrapper from "../ClientWrapper";

export default function Page({ params }: { params: { filter: string } }) {
  return <ClientWrapper filter={params.filter} />;
}
