import { Alert } from 'antd';
import { Outlet} from 'react-router-dom';
import AppHeader from './components/organisms/app-header/app-header';
import { useAuth } from './contexts/auth-context';

export default function App() {
  const { error } = useAuth();

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="shell post-auth">
        {error && <Alert message={error} type="error" showIcon />}
        <Outlet />
      </main>
    </div>
  )
}
