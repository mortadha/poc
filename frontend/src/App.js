import React from 'react';
import { Toaster } from 'sonner';
import Editor from './pages/Editor';

function App() {
  return (
    <div className="dark h-screen w-screen overflow-hidden">
      <Editor />
      <Toaster theme="dark" />
    </div>
  );
}

export default App;
