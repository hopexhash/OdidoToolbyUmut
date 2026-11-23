import { createRoot } from 'react-dom/client';
import './install.css';
import { InstallPage } from './InstallPage';

const mq = window.matchMedia('(prefers-color-scheme: dark)');
const apply = () => document.documentElement.classList.toggle('tk-dark', mq.matches);
apply();
mq.addEventListener('change', apply);

createRoot(document.getElementById('root')!).render(<InstallPage />);
