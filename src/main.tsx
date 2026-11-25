import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/500.css';
import '@fontsource/lora/400-italic.css';
import App from './App';
import './styles.css';

class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:boolean}>{
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<div className="boot"><h1>Let’s turn a fresh page.</h1><p>Lexicon encountered an unexpected problem. Your saved progress is kept on this device.</p><button className="button primary" onClick={()=>location.reload()}>Reload Lexicon</button></div>:this.props.children;}
}
ReactDOM.createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
