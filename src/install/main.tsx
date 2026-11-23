import { createRoot } from 'react-dom/client';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './install.css';
import { InstallPage } from './InstallPage';

createRoot(document.getElementById('root')!).render(<InstallPage />);
