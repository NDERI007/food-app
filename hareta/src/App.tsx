import { Toaster } from 'sonner';
import { Suspense } from 'react';

function App() {
  return (
    <>
      <Suspense fallback={<div>Loading…</div>}>
        <Toaster richColors position='top-right' />
      </Suspense>
    </>
  );
}

export default App;
