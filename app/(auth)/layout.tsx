import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header variant="public" />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">{children}</div>
      </main>
      <Footer />
    </>
  );
}
