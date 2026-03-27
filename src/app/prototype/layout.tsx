export default function PrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`main.flex-grow { flex-grow: 0 !important; }`}</style>
      {children}
    </>
  );
}
