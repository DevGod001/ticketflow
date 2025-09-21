import "./App.css";
import Pages from "@/pages/index.jsx";
import { Toaster } from "@/components/ui/toaster";
import AuthWrapper from "@/components/auth/AuthWrapper";

function App() {
  return (
    <>
      <AuthWrapper>
        <Pages />
      </AuthWrapper>
      <Toaster />
    </>
  );
}

export default App;
