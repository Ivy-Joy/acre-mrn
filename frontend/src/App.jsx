import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Publications from './pages/Publications';
import Grants from './pages/Grants';
import Header from './components/Header';
import Footer from './components/Footer';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />

        <main className="flex-1 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/publications" element={<Publications />} />
            <Route path="/grants" element={<Grants />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}
