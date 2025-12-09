
import { Header } from "./Header";

type MainLayoutProps = {
  children: React.ReactNode;
};

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1 flex justify-center py-8">
        {children}
      </div>
    </div>
  );
}
