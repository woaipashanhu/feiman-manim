import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Player from './pages/Player';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/player/:gradeId/:videoIndex" element={<Player />} />
    </Routes>
  );
}