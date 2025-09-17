import { Toaster } from "sonner";
import { Suspense } from "react";

function App() {
  return (
    <>
      <Suspense fallback={<div>Loading…</div>}>
        <Toaster />
      </Suspense>
    </>
  );
}

export default App;
